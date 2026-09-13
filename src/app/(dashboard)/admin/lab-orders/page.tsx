import { Metadata } from 'next';
import { getActiveLabOrders } from '@/actions/lab-actions';
import { LabOrdersView } from '@/components/admin/lab-orders-view';

export const metadata: Metadata = {
  title: 'Lab Orders & Workshop | OptixOS',
  description: 'Track customer lab orders, fabrication, and optical workshop fitting status.',
};

export const dynamic = 'force-dynamic';

export default async function LabOrdersPage() {
  const initialOrders = await getActiveLabOrders();

  return <LabOrdersView initialOrders={initialOrders} />;
}
