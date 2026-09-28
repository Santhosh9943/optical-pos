'use server';

/**
 * OptixOS Maker-Checker Approval Governance
 * 
 * Provides RBAC protection for critical mutations (deleting/disabling customers or inventory).
 * Non-admin staff cannot delete records directly; their actions generate an approval request
 * and dispatch an urgent notification to store administrators.
 */

import { db } from '@/db';
import {
  approvalRequests,
  customers,
  inventoryItems,
  invoices,
  member as memberTable,
  staffStoreAssignments,
  type ApprovalRequest,
} from '@/db/schema';
import { eq, and, desc, inArray, sql, gt } from 'drizzle-orm';
import { getCurrentSession, isManagerOrAdmin, isOwnerOrSuperAdmin } from '@/lib/auth-utils';
import { dispatchNotificationAction } from '@/actions/notification-actions';
import { revalidatePath } from 'next/cache';
import { invalidateCache } from '@/lib/cache';

export type StoreApprovalType =
  | 'delete_customer'
  | 'disable_customer'
  | 'delete_inventory'
  | 'disable_inventory'
  | 'delete_staff';

export interface CreateStoreApprovalInput {
  type: StoreApprovalType;
  targetId: string;
  targetName: string;
  reason: string;
}

/**
 * Creates a pending approval request and notifies practice administrators.
 */
export async function createStoreApprovalRequestAction(
  input: CreateStoreApprovalInput
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { success: false, error: 'Unauthorized: Session required' };
    }

    const [created] = await db
      .insert(approvalRequests)
      .values({
        type: input.type,
        targetId: input.targetId,
        targetName: input.targetName,
        requesterId: session.user?.id || 'synthetic-session-user',
        requesterEmail: session.user?.email || 'clerk@store.local',
        requesterName: session.user?.name || 'Staff Member',
        reason: input.reason.trim() || 'Staff requested deletion/disabling',
        status: 'pending',
        organizationId: session.organizationId,
      })
      .returning();

    // Notify practice administrators
    await dispatchNotificationAction({
      type: 'approval.requested',
      organizationId: session.organizationId,
      targetRole: 'admin',
      severity: 'medium',
      payload: {
        requestId: created.id,
        requestType: `${input.type.replace('_', ' ').toUpperCase()}: ${input.targetName}`,
        requesterName: session.user?.name || 'Staff Member',
      },
    });

    return { success: true, requestId: created.id };
  } catch (err: unknown) {
    console.error('[createStoreApprovalRequestAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit approval request',
    };
  }
}

/**
 * Fetches approval requests for the current store/organization (Admins only).
 */
export async function getStoreApprovalRequestsAction(
  filterStatus?: 'pending' | 'all'
): Promise<{ success: boolean; requests: ApprovalRequest[]; error?: string }> {
  try {
    const session = await getCurrentSession();
    const isAdmin = await isManagerOrAdmin(session);
    if (!isAdmin) {
      return { success: false, requests: [], error: 'Forbidden: Admin access required' };
    }

    const conditions = [eq(approvalRequests.organizationId, session.organizationId)];
    if (filterStatus === 'pending') {
      conditions.push(eq(approvalRequests.status, 'pending'));
    }

    const rows = await db
      .select()
      .from(approvalRequests)
      .where(and(...conditions))
      .orderBy(desc(approvalRequests.createdAt));

    return { success: true, requests: rows };
  } catch (err: unknown) {
    console.error('[getStoreApprovalRequestsAction] Error:', err);
    return {
      success: false,
      requests: [],
      error: err instanceof Error ? err.message : 'Failed to load requests',
    };
  }
}

/**
 * Resolves (Approves or Rejects) a store approval request.
 * When approved, executes the critical operation atomically while enforcing all safety invariants.
 */
export async function resolveStoreApprovalRequestAction(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentSession();
    const isAdmin = await isManagerOrAdmin(session);
    if (!isAdmin) {
      return { success: false, error: 'Forbidden: Admin access required to resolve approval requests' };
    }

    const [request] = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.id, requestId),
          eq(approvalRequests.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!request) {
      return { success: false, error: 'Approval request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: `Request already resolved as ${request.status}` };
    }

    // Maker-Checker Invariant: Requester cannot approve their own request
    if (request.requesterId && session.user?.id && request.requesterId === session.user.id) {
      return {
        success: false,
        error: 'Maker-Checker Violation: You cannot review or resolve your own approval request',
      };
    }

    if (decision === 'approved') {
      if (request.type === 'delete_customer' || request.type === 'disable_customer') {
        // Customer Safety Invariant: Check for active orders
        const activeInvoices = await db
          .select({ invoiceNumber: invoices.invoiceNumber })
          .from(invoices)
          .where(
            and(
              eq(invoices.customerId, request.targetId),
              eq(invoices.organizationId, session.organizationId),
              inArray(invoices.orderStatus, ['ORDERED', 'SENT_TO_LAB', 'IN_FITTING', 'READY_FOR_COLLECTION'])
            )
          );

        if (activeInvoices.length > 0) {
          return {
            success: false,
            error: `Cannot approve deletion: Customer has active unclosed order(s) (#${activeInvoices[0].invoiceNumber}). Deliver or close active orders first.`,
          };
        }

        // Customer Safety Invariant: Check for pending balance
        const balanceInvoices = await db
          .select({ invoiceNumber: invoices.invoiceNumber, balanceDue: invoices.balanceDue })
          .from(invoices)
          .where(
            and(
              eq(invoices.customerId, request.targetId),
              eq(invoices.organizationId, session.organizationId),
              gt(sql`CAST(${invoices.balanceDue} AS NUMERIC)`, 0)
            )
          );

        if (balanceInvoices.length > 0) {
          return {
            success: false,
            error: `Cannot approve deletion: Customer has outstanding balance of ₹${balanceInvoices[0].balanceDue} on invoice #${balanceInvoices[0].invoiceNumber}.`,
          };
        }

        // Safe soft-delete: preserves historical invoices, items, and prescriptions for audit
        await db
          .update(customers)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(customers.id, request.targetId),
              eq(customers.organizationId, session.organizationId)
            )
          );

        revalidatePath('/admin/patients');
        await invalidateCache({ orgId: session.organizationId, namespace: 'patients' });
      } else if (request.type === 'delete_inventory' || request.type === 'disable_inventory') {
        // Deactivate inventory item
        await db
          .update(inventoryItems)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryItems.id, request.targetId),
              eq(inventoryItems.organizationId, session.organizationId)
            )
          );

        revalidatePath('/admin/inventory');
        await invalidateCache({ orgId: session.organizationId, namespace: 'inventory' });
      } else if (request.type === 'delete_staff') {
        const isOwner = await isOwnerOrSuperAdmin(session);
        if (!isOwner) {
          return {
            success: false,
            error: 'Forbidden: Only the Organization Owner or Super Admin can approve staff deletion',
          };
        }

        await db
          .delete(staffStoreAssignments)
          .where(
            and(
              eq(staffStoreAssignments.organizationId, session.organizationId),
              eq(staffStoreAssignments.userId, request.targetId)
            )
          );

        await db
          .delete(memberTable)
          .where(
            and(
              eq(memberTable.organizationId, session.organizationId),
              eq(memberTable.userId, request.targetId)
            )
          );

        revalidatePath('/admin/staff');
        revalidatePath('/owner/staff');
        await invalidateCache({ orgId: session.organizationId, namespace: 'staff' });
      }
    }

    // Record decision
    await db
      .update(approvalRequests)
      .set({
        status: decision,
        reviewedBy: session.user?.email || 'Admin',
        reviewedAt: new Date(),
        reason: reviewNotes ? `${request.reason} [Reviewer: ${reviewNotes}]` : request.reason,
      })
      .where(eq(approvalRequests.id, requestId));

    // Dispatch notification to the requester
    if (request.requesterId) {
      await dispatchNotificationAction({
        type: 'system.announcement',
        organizationId: session.organizationId,
        recipientId: request.requesterId,
        severity: decision === 'approved' ? 'medium' : 'high',
        payload: {
          title: `Request ${decision.toUpperCase()}: ${request.targetName}`,
          message: `Your request to ${request.type.replace('_', ' ')} "${request.targetName}" was ${decision} by ${session.user?.name || 'Administrator'}.${reviewNotes ? ` Notes: ${reviewNotes}` : ''}`,
          actionUrl: request.type.includes('customer') ? '/admin/patients' : '/admin/inventory',
        },
      });
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('[resolveStoreApprovalRequestAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to resolve request',
    };
  }
}
