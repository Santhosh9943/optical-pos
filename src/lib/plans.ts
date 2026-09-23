export interface PricingPlan {
  id: 'starter' | 'plus' | 'enterprise';
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  periodLabel: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
  badge?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter Practice',
    tagline: 'Ideal for independent opticians and single-chair clinics.',
    monthlyPrice: 0,
    annualPrice: 0,
    periodLabel: 'Free Forever',
    buttonText: 'Get Started Free',
    features: [
      '1 Store / POS Counter',
      'Up to 100 invoices / month',
      'Clinical Refraction Matrix (0.25 D steps)',
      'Single Vision & Bifocal Spectacle Pair Wizard',
      '80mm Thermal Receipt Printing',
      'Customer & Prescription History',
      'Email & Community Support',
    ],
  },
  {
    id: 'plus',
    name: 'Growth Plus',
    tagline: 'For fast-growing optical retail stores needing multi-staff & speed.',
    monthlyPrice: 999,
    annualPrice: 9990,
    periodLabel: '₹999 / month',
    isPopular: true,
    badge: 'Most Popular',
    buttonText: 'Start 14-Day Free Trial',
    features: [
      'Up to 3 Physical Branches',
      'Unlimited Invoices & Customers',
      '4 POS Viewport Modes (Adaptive, Rx, Billing, Dense)',
      'High-Speed Barcode Scanning (<10ms)',
      'A4 Laser GST Tax Invoices (5% & 18% splits)',
      'Workshop Lab Job Slips (Price Redacted)',
      'Staff Role Scoping (Cashier, Optometrist, Manager)',
      'Upstash Redis Search Acceleration',
      'Priority Phone & Chat Support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pro',
    tagline: 'For optical retail chains, optical labs, and high-volume practices.',
    monthlyPrice: 2499,
    annualPrice: 24990,
    periodLabel: '₹2,499 / month',
    badge: 'Full Platform Power',
    buttonText: 'Select Enterprise Pro',
    features: [
      'Unlimited Stores & POS Counters',
      'Super Admin Perspective Simulator',
      'Multi-Branch Consolidated GMV & Tax Analytics',
      'WhatsApp Receipt Delivery & Order Readiness Alerts',
      'Customer Recall Reminders (Annual Eye Checkup)',
      'Custom Print Header & Thermal Logo Design',
      'Optical Lab Workshop Kanban Pipeline',
      'Dedicated Account Manager & 99.9% SLA',
    ],
  },
];
