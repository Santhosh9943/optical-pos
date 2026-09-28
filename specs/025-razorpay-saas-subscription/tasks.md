# Tasks Breakdown: Razorpay SaaS Subscription & Payment System

- **Feature ID**: `025-razorpay-saas-subscription`

---

## Task Checklist

### Phase 1: Environment & Secrets Setup
- [x] **Task 1.1**: Update `.env.local` and `.env.example` with Razorpay test keys (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).

### Phase 2: Database Schema & Subscriptions Table
- [x] **Task 2.1**: Update `organizations` table in `src/db/schema.ts` with `planId`, `subscriptionStatus`, `subscriptionPeriod`, `subscriptionEndsAt`, and `hasCompletedOnboarding`.
- [x] **Task 2.2**: Define `subscriptions` table in `src/db/schema.ts` for immutable transaction history.
- [x] **Task 2.3**: Synchronize database schema via migration script `scripts/migrate-subscriptions.ts`.

### Phase 3: Razorpay Server Engine & Actions
- [x] **Task 3.1**: Create `src/lib/razorpay.ts` with order creation, payment link generation, and constant-time HMAC SHA-256 verification.
- [x] **Task 3.2**: Create `src/actions/subscription-actions.ts` with `createRazorpaySubscriptionOrderAction`, `verifyRazorpayPaymentAction`, and `handlePaymentFailureAction`.
- [x] **Task 3.3**: Update `src/actions/plan-actions.ts` to integrate with new subscription actions.

### Phase 4: Feature Gating & Entitlements
- [x] **Task 4.1**: Create `src/lib/feature-gate.ts` with domain limits (branches, invoices, lab orders, analytics).
- [x] **Task 4.2**: Create `<PlanUpgradeGate>` and `<UpgradeModal>` in `src/components/subscription/`.

### Phase 5: Client Checkout & Onboarding UI
- [x] **Task 5.1**: Build `useRazorpayCheckout` client utility for loading `checkout.js` and managing the modal lifecycle.
- [x] **Task 5.2**: Update `src/app/pricing/page.tsx` with live Razorpay checkout, monthly/annual toggles, and direct activation for free tier.
- [x] **Task 5.3**: Build `<SubscriberOnboardingModal>` in `src/components/subscription/` with 4-step interactive tour and skip option.
- [x] **Task 5.4**: Integrate onboarding modal in dashboard layout for newly subscribed organizations.

### Phase 6: Webhook Redundancy
- [x] **Task 6.1**: Implement `/api/webhooks/razorpay/route.ts` with raw body HMAC verification for `payment.captured`, `order.paid`, `payment.failed`.

### Phase 7: Verification & Quality Gate
- [x] **Task 7.1**: Run `npm run check` (0 errors, 0 warnings).
- [x] **Task 7.2**: Run `npm run audit:security` (0 critical violations).
- [x] **Task 7.3**: Run `graphify update .` to sync AST knowledge graph.
- [x] **Task 7.4**: Update documentation, `SESSION_HANDOFF.md`, and `TASKS.md`.
