# Feature Specification: Razorpay SaaS Subscription & Payment System

- **Feature ID**: `025-razorpay-saas-subscription`
- **Status**: `In Progress`
- **Owner**: `AI Engineering Agent (OptixOS)`
- **Target Release**: `Phase 25 (SaaS Commercialization & Subscriptions)`

---

## 1. Problem Statement & Business Objective
- **Problem**: Currently, OptixOS has pricing tier definitions (`starter`, `plus`, `enterprise`) in `src/lib/plans.ts`, but clicking "Select Plan" does not process payments or persist real subscription states in PostgreSQL. Organizations cannot upgrade their branches, invoice limits, or unlock enterprise features like workshop lab pipelines and multi-branch analytics.
- **Objective**: Implement an end-to-end, production-grade Razorpay payment integration for SaaS subscriptions:
  1. Server-side Razorpay Order creation with exact INR paise math (`decimal.js`).
  2. In-app Razorpay Standard Checkout (`checkout.js`) with hosted payment link fallback.
  3. Cryptographic HMAC SHA-256 signature verification and webhook redundancy.
  4. Immediate database plan activation on `organizations` and immutable financial audit logging in `subscriptions`.
  5. Lovable first-time subscriber welcome & 4-step onboarding demo tour with skip capability.
  6. Reusable feature-gating mechanism (`<PlanUpgradeGate>`, `<UpgradeModal>`, `canAccessFeature()`).
  7. Robust failure and error recovery handling.

---

## 2. User Stories & Personas

- **Optical Practice Owner / Store Admin**:
  - *As an optical practice owner, I want to upgrade to Growth Plus or Enterprise Pro using UPI, Cards, or Netbanking, so my store can open multiple branches and issue unlimited GST tax invoices.*
- **Store Manager**:
  - *As a store manager, when I try to access an enterprise feature (e.g., Workshop Lab Kanban or Multi-Branch GMV Analytics), I want to see a clear upgrade prompt with 1-click checkout rather than an unhandled error.*
- **First-Time Subscriber**:
  - *As a newly subscribed practice owner, I want a warm, helpful walkthrough demo of OptixOS capabilities with a skip option so I can orient my staff quickly.*

---

## 3. Optical Domain & Statutory Invariants

- [x] **Monetary Precision**: All subscription prices and Razorpay orders use `decimal.js`. Base prices are converted to paise via `.times(100).toNumber()`.
- [x] **Secret Isolation**: `RAZORPAY_KEY_SECRET` is strictly server-only (`.env.local`). Only `NEXT_PUBLIC_RAZORPAY_KEY_ID` is exposed to the client.
- [x] **Cryptographic Verification**: Every client payment is verified via `crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId)` with constant-time equality check.
- [x] **Multi-Tenant Isolation**: Subscription states are bound strictly to `organizationId`.
- [x] **Audit Ledger**: Every transaction (created, paid, failed) is recorded in `subscriptions` table.

---

## 4. Architectural Decision: Standard Checkout vs Hosted Page

### Evaluation Matrix:
| Criteria | Standard Checkout Modal (`checkout.js`) | Hosted Payment Page (`rzp.io`) |
| :--- | :--- | :--- |
| **User Experience** | **Superior**: Seamless in-app popup matching dark/light mode | Context switch: Leaves OptixOS to Razorpay domain |
| **Conversion Rate** | **High**: ~25-30% lower cart abandonment | Lower: Users drop off on external redirect |
| **State Retention** | **Zero Loss**: Preserves full SPA state and active route | Route reset: Requires query param callback reload |
| **Fallback Capability** | Can generate hosted link if modal is blocked | Standalone only |

**Decision**: Implement **Standard Checkout Modal as primary UX**, with automatic hosted payment link generation as fallback.

---

## 5. Functional Requirements

### 5.1 Data Contracts & Schema
- `organizations`: add `planId`, `subscriptionStatus`, `subscriptionPeriod`, `subscriptionEndsAt`, `hasCompletedOnboarding`.
- `subscriptions`: new table recording `id`, `organizationId`, `planId`, `billingCycle`, `amount`, `currency`, `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `status`, `failureReason`, timestamps.

### 5.2 Endpoints & Actions
- `POST /api/razorpay/create-order` or `createRazorpayOrderAction(planId, billingCycle)`
- `POST /api/razorpay/verify-payment` or `verifyRazorpayPaymentAction(payload)`
- `POST /api/webhooks/razorpay`: Asynchronous webhook listener for `payment.captured`, `order.paid`, `payment.failed`.
- `completeOnboardingAction()`: Sets `hasCompletedOnboarding: true`.

### 5.3 UI Components
- Enhanced `/pricing` page with dynamic checkout button, loading states, and promo badges.
- `PaymentFailureModal`: Friendly recovery with 1-click retry.
- `SubscriberOnboardingModal`: Celebratory welcome modal with 4-step guided tour and skip button.
- `PlanUpgradeGate`: Wraps restricted views or buttons and shows upgrade dialog when locked.

---

## 6. Acceptance Criteria
1. Selecting a paid plan creates a legitimate Razorpay order with `rzp_test_TRlarZort0e1K7`.
2. Standard Checkout modal opens with prefilled user details.
3. Successful test payment updates `organizations.planId` and inserts into `subscriptions`.
4. First-time subscriber sees the celebratory welcome modal and can click through the 4-step tour or skip.
5. In-app feature gating blocks restricted features on starter plan with an upgrade prompt.
6. TypeScript strict typecheck (`npm run check`) passes with 0 errors.
7. Automated security audit (`npm run audit:security`) passes with 0 critical violations.
