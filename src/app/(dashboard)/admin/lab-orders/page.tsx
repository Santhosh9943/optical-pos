import { Metadata } from 'next';
import { getActiveLabOrders } from '@/actions/lab-actions';
import { getCurrentPlanAction } from '@/actions/plan-actions';
import { LabOrdersView } from '@/components/admin/lab-orders-view';
import { PlanUpgradeGate } from '@/components/subscription/plan-upgrade-gate';

export const metadata: Metadata = {
  title: 'Lab Orders & Workshop | OptixOS',
  description: 'Track customer lab orders, fabrication, and optical workshop fitting status.',
};

export const dynamic = 'force-dynamic';

export default async function LabOrdersPage() {
  const [initialOrders, planStatus] = await Promise.all([
    getActiveLabOrders(),
    getCurrentPlanAction(),
  ]);

  return (
    <PlanUpgradeGate featureKey="workshop_lab_kanban" currentPlan={planStatus.planId}>
      <LabOrdersView initialOrders={initialOrders} />
    </PlanUpgradeGate>
  );
}
