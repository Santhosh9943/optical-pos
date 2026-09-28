'use server';

import { db } from '@/db';
import { productTypes, type ProductType } from '@/db/schema';
import { getCurrentSession, requireManagerOrAdmin } from '@/lib/auth-utils';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { seedDefaultProductTypesForOrganization } from '@/lib/default-product-types';

export interface StepOption {
  label: string;
  value: string;
  surcharge?: number;
  showIfParent?: string[];
  description?: string;
}

export interface StepDependency {
  dependsOnStepName?: string;
  condition?: 'selected' | 'matches';
}

export interface WorkflowStep {
  step_name: string;
  input_type: 'single_select' | 'multi_select' | 'text';
  options_array: StepOption[];
  dependency_logic?: StepDependency;
  isRequired?: boolean;
}

export interface ProductTypeItem {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  basePrice: string | null;
  isSystemDefault: boolean;
  isEnabled: boolean;
  displayOrder: number;
  requiresFrame: boolean;
  requiresPrescription: boolean;
  workflowSteps: WorkflowStep[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

const saveProductTypeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional().nullable(),
  icon: z.string().optional().default('Package'),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').default('0.00'),
  isEnabled: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  requiresFrame: z.boolean().default(false),
  requiresPrescription: z.boolean().default(false),
  workflowSteps: z.array(z.any()).default([]),
});

export type SaveProductTypeInput = z.infer<typeof saveProductTypeSchema>;

/**
 * Fetch all product types configured for the active organization.
 * Automatically provisions standard optical workflows if none exist yet.
 */
export async function getProductTypesAction(): Promise<{
  success: boolean;
  data?: ProductTypeItem[];
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { success: true, data: [] };
    }

    let rows = await db
      .select()
      .from(productTypes)
      .where(eq(productTypes.organizationId, session.organizationId))
      .orderBy(asc(productTypes.displayOrder), asc(productTypes.name));

    // Auto-seed defaults if practice has 0 product types
    if (rows.length === 0) {
      await seedDefaultProductTypesForOrganization(session.organizationId);
      rows = await db
        .select()
        .from(productTypes)
        .where(eq(productTypes.organizationId, session.organizationId))
        .orderBy(asc(productTypes.displayOrder), asc(productTypes.name));
    }

    const formatted: ProductTypeItem[] = rows.map((r) => ({
      ...r,
      workflowSteps: (r.workflowSteps as unknown as WorkflowStep[]) || [],
    }));

    return { success: true, data: formatted };
  } catch (err: unknown) {
    console.error('[getProductTypesAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch product types',
    };
  }
}

/**
 * Fetch only enabled product types for POS billing counters.
 * Automatically provisions standard optical workflows if none exist yet.
 */
export async function getEnabledProductTypesAction(): Promise<{
  success: boolean;
  data?: ProductTypeItem[];
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.organizationId) {
      return { success: true, data: [] };
    }

    let rows = await db
      .select()
      .from(productTypes)
      .where(
        and(
          eq(productTypes.organizationId, session.organizationId),
          eq(productTypes.isEnabled, true)
        )
      )
      .orderBy(asc(productTypes.displayOrder), asc(productTypes.name));

    // Auto-seed defaults if practice has 0 product types
    if (rows.length === 0) {
      await seedDefaultProductTypesForOrganization(session.organizationId);
      rows = await db
        .select()
        .from(productTypes)
        .where(
          and(
            eq(productTypes.organizationId, session.organizationId),
            eq(productTypes.isEnabled, true)
          )
        )
        .orderBy(asc(productTypes.displayOrder), asc(productTypes.name));
    }

    const formatted: ProductTypeItem[] = rows.map((r) => ({
      ...r,
      workflowSteps: (r.workflowSteps as unknown as WorkflowStep[]) || [],
    }));

    return { success: true, data: formatted };
  } catch (err: unknown) {
    console.error('[getEnabledProductTypesAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch enabled product types',
    };
  }
}

/**
 * Create or update a product type and its sequential workflow builder steps.
 */
export async function saveProductTypeAction(input: SaveProductTypeInput): Promise<{
  success: boolean;
  data?: ProductTypeItem;
  error?: string;
}> {
  try {
    const session = await requireManagerOrAdmin();
    const validated = saveProductTypeSchema.parse(input);

    if (validated.id) {
      // Update existing
      const [updated] = await db
        .update(productTypes)
        .set({
          code: validated.code.toUpperCase().trim(),
          name: validated.name.trim(),
          description: validated.description?.trim() || null,
          icon: validated.icon || 'Package',
          basePrice: validated.basePrice,
          isEnabled: validated.isEnabled,
          displayOrder: validated.displayOrder,
          requiresFrame: validated.requiresFrame,
          requiresPrescription: validated.requiresPrescription,
          workflowSteps: validated.workflowSteps as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productTypes.id, validated.id),
            eq(productTypes.organizationId, session.organizationId)
          )
        )
        .returning();

      if (!updated) {
        return { success: false, error: 'Product type not found or access denied' };
      }

      revalidatePath('/admin/settings');
      revalidatePath('/pos/new-bill');

      return {
        success: true,
        data: {
          ...updated,
          workflowSteps: (updated.workflowSteps as unknown as WorkflowStep[]) || [],
        },
      };
    } else {
      // Create new custom product type
      const [inserted] = await db
        .insert(productTypes)
        .values({
          organizationId: session.organizationId,
          code: validated.code.toUpperCase().trim(),
          name: validated.name.trim(),
          description: validated.description?.trim() || null,
          icon: validated.icon || 'Package',
          basePrice: validated.basePrice,
          isSystemDefault: false,
          isEnabled: validated.isEnabled,
          displayOrder: validated.displayOrder,
          requiresFrame: validated.requiresFrame,
          requiresPrescription: validated.requiresPrescription,
          workflowSteps: validated.workflowSteps as any,
        })
        .returning();

      revalidatePath('/admin/settings');
      revalidatePath('/pos/new-bill');

      return {
        success: true,
        data: {
          ...inserted,
          workflowSteps: (inserted.workflowSteps as unknown as WorkflowStep[]) || [],
        },
      };
    }
  } catch (err: unknown) {
    console.error('[saveProductTypeAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save product type',
    };
  }
}

/**
 * Toggle whether a product type is enabled for POS billing.
 */
export async function toggleProductTypeAction(
  id: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireManagerOrAdmin();
    await db
      .update(productTypes)
      .set({ isEnabled, updatedAt: new Date() })
      .where(
        and(
          eq(productTypes.id, id),
          eq(productTypes.organizationId, session.organizationId)
        )
      );

    revalidatePath('/admin/settings');
    revalidatePath('/pos/new-bill');
    return { success: true };
  } catch (err: unknown) {
    console.error('[toggleProductTypeAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to toggle product type',
    };
  }
}

/**
 * Delete a custom product type. System defaults cannot be deleted (they can only be disabled).
 */
export async function deleteProductTypeAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireManagerOrAdmin();

    const [existing] = await db
      .select()
      .from(productTypes)
      .where(
        and(
          eq(productTypes.id, id),
          eq(productTypes.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Product type not found' };
    }

    if (existing.isSystemDefault) {
      return {
        success: false,
        error: 'System default optical product types cannot be deleted. You can disable them instead.',
      };
    }

    await db
      .delete(productTypes)
      .where(
        and(
          eq(productTypes.id, id),
          eq(productTypes.organizationId, session.organizationId)
        )
      );

    revalidatePath('/admin/settings');
    revalidatePath('/pos/new-bill');
    return { success: true };
  } catch (err: unknown) {
    console.error('[deleteProductTypeAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete product type',
    };
  }
}
