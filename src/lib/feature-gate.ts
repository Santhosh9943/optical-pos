/**
 * OptixOS Feature Entitlements & Plan Gating Engine
 * Central authority for evaluating organization plan capabilities, limits, and upgrade requirements.
 */

export type PlanTier = 'starter' | 'plus' | 'enterprise';

export type FeatureKey =
  | 'unlimited_invoices'
  | 'multi_branch'
  | 'workshop_lab_kanban'
  | 'a4_laser_gst_invoice'
  | 'whatsapp_delivery'
  | 'multi_branch_analytics'
  | 'perspective_simulator'
  | 'custom_print_branding';

export interface PlanLimits {
  tier: PlanTier;
  maxBranches: number;
  maxInvoicesPerMonth: number | 'unlimited';
  allowedFeatures: Record<FeatureKey, boolean>;
}

export const PLAN_LIMITS_MAP: Record<PlanTier, PlanLimits> = {
  starter: {
    tier: 'starter',
    maxBranches: 1,
    maxInvoicesPerMonth: 100,
    allowedFeatures: {
      unlimited_invoices: false,
      multi_branch: false,
      workshop_lab_kanban: false,
      a4_laser_gst_invoice: false,
      whatsapp_delivery: false,
      multi_branch_analytics: false,
      perspective_simulator: false,
      custom_print_branding: false,
    },
  },
  plus: {
    tier: 'plus',
    maxBranches: 3,
    maxInvoicesPerMonth: 'unlimited',
    allowedFeatures: {
      unlimited_invoices: true,
      multi_branch: true,
      workshop_lab_kanban: true,
      a4_laser_gst_invoice: true,
      whatsapp_delivery: false,
      multi_branch_analytics: false,
      perspective_simulator: false,
      custom_print_branding: true,
    },
  },
  enterprise: {
    tier: 'enterprise',
    maxBranches: 9999, // effectively unlimited
    maxInvoicesPerMonth: 'unlimited',
    allowedFeatures: {
      unlimited_invoices: true,
      multi_branch: true,
      workshop_lab_kanban: true,
      a4_laser_gst_invoice: true,
      whatsapp_delivery: true,
      multi_branch_analytics: true,
      perspective_simulator: true,
      custom_print_branding: true,
    },
  },
};

export const FEATURE_METADATA: Record<
  FeatureKey,
  { name: string; description: string; requiredPlan: PlanTier; planBadge: string }
> = {
  unlimited_invoices: {
    name: 'Unlimited Invoices & Billing',
    description: 'Issue unlimited GST invoices beyond the 100/mo free limit.',
    requiredPlan: 'plus',
    planBadge: 'Growth Plus',
  },
  multi_branch: {
    name: 'Multi-Store & Branch Support',
    description: 'Add and operate multiple physical optical branches from one account.',
    requiredPlan: 'plus',
    planBadge: 'Growth Plus',
  },
  workshop_lab_kanban: {
    name: 'Optical Lab Workshop Pipeline',
    description: 'Track lens fitting, edging, and glazing orders on an interactive Kanban board.',
    requiredPlan: 'plus',
    planBadge: 'Growth Plus',
  },
  a4_laser_gst_invoice: {
    name: 'A4 Laser GST Tax Invoices',
    description: 'Generate and print detailed A4 tax invoices with CGST/SGST/IGSN breakdowns.',
    requiredPlan: 'plus',
    planBadge: 'Growth Plus',
  },
  whatsapp_delivery: {
    name: 'WhatsApp Receipt & Order Alerts',
    description: 'Automatically send PDF receipts and spectacles ready-for-collection alerts via WhatsApp.',
    requiredPlan: 'enterprise',
    planBadge: 'Enterprise Pro',
  },
  multi_branch_analytics: {
    name: 'Multi-Branch Consolidated GMV & Tax Analytics',
    description: 'Deep financial analytics, lens coating sales reports, and multi-store comparative metrics.',
    requiredPlan: 'enterprise',
    planBadge: 'Enterprise Pro',
  },
  perspective_simulator: {
    name: 'Super Admin Perspective Simulator',
    description: 'Simulate branch, role, and cashier perspectives for practice training and audits.',
    requiredPlan: 'enterprise',
    planBadge: 'Enterprise Pro',
  },
  custom_print_branding: {
    name: 'Custom Thermal & Laser Branding',
    description: 'Upload high-resolution practice logo and customize header/footer clinic text.',
    requiredPlan: 'plus',
    planBadge: 'Growth Plus',
  },
};

/**
 * Checks whether a given plan tier has access to a specific feature.
 */
export function canAccessFeature(planId: string | null | undefined, feature: FeatureKey): boolean {
  const normalizedTier = (planId?.toLowerCase() || 'starter') as PlanTier;
  const limits = PLAN_LIMITS_MAP[normalizedTier] || PLAN_LIMITS_MAP.starter;
  return Boolean(limits.allowedFeatures[feature]);
}
