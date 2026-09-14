import { getStoreProfile } from '@/actions/settings-actions';
import { SettingsView } from '@/components/admin/settings-view';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Store Settings & Print Engine | OptixOS',
  description: 'Manage store identity, GSTIN details, default tax rate, and receipt print engine configurations.',
};

export default async function SettingsPage() {
  const profile = await getStoreProfile();

  return <SettingsView initialProfile={profile} />;
}
