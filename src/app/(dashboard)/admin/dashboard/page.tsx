import { DashboardView } from '@/components/admin/dashboard-view';

export const metadata = {
  title: 'Operational Dashboard | OptixOS',
  description: 'Compact high-density operational telemetry, live sales KPIs, and workshop orders.',
};

export default function AdminDashboardPage() {
  return <DashboardView />;
}
