import {
  Building2,
  Printer,
  Mail,
  RefreshCw,
  LayoutGrid,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';

export type SettingsCategoryKey =
  | 'store'
  | 'account'
  | 'communications'
  | 'system';

export interface SettingsNavItem {
  id: string;
  title: string;
  icon: LucideIcon;
  tabKey: string;
  testId: string;
  badge?: string;
  roles?: Array<'user' | 'admin' | 'organizer' | 'super_admin'>;
}

export interface SettingsCategoryGroup {
  id: SettingsCategoryKey;
  label: string;
  items: SettingsNavItem[];
}

/**
 * Authoritative OptixOS Settings & Preferences Registry.
 * Compact, categorized registry of all practice configuration tabs.
 * Each item maps to a distinct, non-redundant settings panel.
 */
export const SETTINGS_NAV_GROUPS: SettingsCategoryGroup[] = [
  {
    id: 'store',
    label: 'Store & Practice',
    items: [
      {
        id: 'general-profile',
        title: 'Store Profile & Legal',
        icon: Building2,
        tabKey: 'general',
        testId: 'tab-general-profile',
      },
      {
        id: 'print-config',
        title: 'Hardware & Print Engine',
        icon: Printer,
        tabKey: 'print',
        testId: 'tab-print-config',
      },
      {
        id: 'pos-layout',
        title: 'POS Viewport Layout',
        icon: LayoutGrid,
        tabKey: 'pos-layout',
        testId: 'tab-pos-layout',
        badge: 'Display',
      },
    ],
  },
  {
    id: 'account',
    label: 'Profile & Security',
    items: [
      {
        id: 'account-security',
        title: 'Account & Security',
        icon: KeyRound,
        tabKey: 'account',
        testId: 'tab-account-security',
        badge: '2FA',
      },
    ],
  },
  {
    id: 'communications',
    label: 'Communications & Alerts',
    items: [
      {
        id: 'email-smtp',
        title: 'Email & SMTP Gateway',
        icon: Mail,
        tabKey: 'email',
        testId: 'tab-email-smtp',
      },
    ],
  },
  {
    id: 'system',
    label: 'Subscription & System',
    items: [
      {
        id: 'system-engine',
        title: 'System Engine & Cache',
        icon: RefreshCw,
        tabKey: 'system',
        testId: 'tab-system-engine',
      },
    ],
  },
];
