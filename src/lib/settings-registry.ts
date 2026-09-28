import {
  Building2,
  Printer,
  Sliders,
  Mail,
  ShieldCheck,
  Store,
  Users,
  Percent,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  Bell,
  KeyRound,
  ShieldAlert,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export type SettingsCategoryKey =
  | 'store'
  | 'catalog'
  | 'account'
  | 'team'
  | 'communications'
  | 'system';

export interface SettingsNavItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tabKey?: string; // Query param for /admin/settings?tab=...
  href?: string; // Direct link if distinct route (e.g. /admin/staff, /admin/branches)
  testId: string;
  badge?: string;
  roles?: Array<'user' | 'admin' | 'organizer' | 'super_admin'>;
}

export interface SettingsCategoryGroup {
  id: SettingsCategoryKey;
  label: string;
  description: string;
  items: SettingsNavItem[];
}

/**
 * Authoritative OptixOS Settings & Preferences Registry.
 * Modular, categorized registry of all practice configurations.
 * To add any future settings feature, simply append an item to the appropriate group here.
 */
export const SETTINGS_NAV_GROUPS: SettingsCategoryGroup[] = [
  {
    id: 'store',
    label: 'Store & Practice',
    description: 'Practice identity, legal registrations, print hardware & counter layouts',
    items: [
      {
        id: 'general-profile',
        title: 'Store Identity & Legal Details',
        description: 'Practice name, address, phone, GSTIN and legal branding',
        icon: Building2,
        tabKey: 'general',
        testId: 'tab-general-profile',
      },
      {
        id: 'print-config',
        title: 'Hardware & Print Engine',
        description: '80mm thermal receipts, A4 tax invoices and printer preferences',
        icon: Printer,
        tabKey: 'print',
        testId: 'tab-print-config',
      },
      {
        id: 'pos-layout',
        title: 'POS Viewport & Counter Layout',
        description: 'Default sales counter viewport (Adaptive, Split, or Dense)',
        icon: LayoutGrid,
        tabKey: 'pos-layout',
        testId: 'tab-pos-layout',
      },
      {
        id: 'branches',
        title: 'Branch Store Locations',
        description: 'Multi-store locations, billing terminals and counter assignments',
        icon: Store,
        href: '/admin/branches',
        testId: 'tab-branch-locations',
        roles: ['admin', 'organizer', 'super_admin'],
      },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog & Dispensing',
    description: 'Product categories, custom dispensing workflows, and tax rules',
    items: [
      {
        id: 'product-types',
        title: 'Product Types & Workflows',
        description: 'Spectacle lenses, frames, sunglasses, CLs & sequential wizard steps',
        icon: Sliders,
        tabKey: 'products',
        testId: 'tab-product-types',
        badge: 'Workflows',
      },
      {
        id: 'tax-rules',
        title: 'Statutory GST & Taxes',
        description: 'Statutory Indian GST rates (5% lenses, 18% frames) and default tax',
        icon: Percent,
        tabKey: 'general',
        testId: 'tab-tax-rules',
      },
    ],
  },
  {
    id: 'account',
    label: 'Profile & Security',
    description: 'Personal user profile, password setup, and two-factor authentication',
    items: [
      {
        id: 'account-security',
        title: 'User Profile & Password',
        description: 'Name, email, password setup & authentication providers',
        icon: KeyRound,
        tabKey: 'account',
        testId: 'tab-account-security',
      },
      {
        id: 'two-factor-auth',
        title: 'Two-Factor Authentication (2FA)',
        description: 'Authenticator TOTP apps, Email OTP verification & recovery codes',
        icon: ShieldCheck,
        tabKey: 'account',
        testId: 'tab-two-factor-auth',
        badge: 'Secure',
      },
    ],
  },
  {
    id: 'team',
    label: 'Team & Permissions',
    description: 'Staff directory, role permissions, and access controls',
    items: [
      {
        id: 'store-staff',
        title: 'Store Staff Directory',
        description: 'Cashiers, optometrists, managers, invite links & security PINs',
        icon: Users,
        href: '/admin/staff',
        testId: 'tab-store-staff',
        roles: ['admin', 'organizer', 'super_admin'],
        badge: 'Team',
      },
      {
        id: 'maker-checker',
        title: 'Approval Rules & Limits',
        description: 'Maximum cashier discount thresholds and maker-checker rules',
        icon: ShieldAlert,
        href: '/owner/approvals',
        testId: 'tab-maker-checker',
        roles: ['organizer', 'super_admin'],
      },
    ],
  },
  {
    id: 'communications',
    label: 'Communications & Alerts',
    description: 'Email server credentials, notification preferences and messaging',
    items: [
      {
        id: 'email-smtp',
        title: 'Email & SMTP Gateway',
        description: 'Custom SMTP credentials, automated receipt & invoice dispatch',
        icon: Mail,
        tabKey: 'email',
        testId: 'tab-email-smtp',
      },
      {
        id: 'notification-preferences',
        title: 'Notification Preferences',
        description: 'Low inventory stock alerts, daily closing reports and ping settings',
        icon: Bell,
        tabKey: 'notifications',
        testId: 'tab-notification-preferences',
      },
    ],
  },
  {
    id: 'system',
    label: 'Subscription & System',
    description: 'SaaS plan tiers, billing invoices, and data cache diagnostics',
    items: [
      {
        id: 'saas-plan',
        title: 'Practice Subscription Plan',
        description: 'Current subscription plan, feature gates, and billing invoices',
        icon: Sparkles,
        href: '/pricing',
        testId: 'tab-saas-plan',
        roles: ['organizer', 'super_admin'],
        badge: 'Upgrade',
      },
      {
        id: 'system-engine',
        title: 'System Engine & Cache Purge',
        description: 'Upstash Redis cache clear, local storage purge & diagnostics',
        icon: RefreshCw,
        tabKey: 'system',
        testId: 'tab-system-engine',
      },
    ],
  },
];
