# Implementation Plan: Razorpay SaaS Subscription & Payment System

- **Feature ID**: `025-razorpay-saas-subscription`
- **Target Date**: `Phase 25`

---

## 1. Architectural Blueprint

```mermaid
sequenceDiagram
    autonumber
    actor User as Practice Admin
    participant UI as Pricing Page / Upgrade Modal
    participant RZP_JS as Razorpay Checkout.js
    participant Action as Server Action (Razorpay API)
    participant DB as Neon PostgreSQL (Organizations & Subscriptions)
    participant Tour as Onboarding Welcome Dialog

    User->>UI: Selects Plan ("Growth Plus" - Monthly ₹999)
    UI->>Action: createRazorpayOrderAction(planId, billingCycle)
    Action->>Action: Calculate paise with Decimal.js
    Action->>Action: Call Razorpay API (POST /v1/orders)
    Action-->>UI: { orderId, amount, currency, keyId }
    UI->>RZP_JS: Initialize Razorpay(options).open()
    RZP_JS-->>User: Renders secure payment popup (Cards/UPI/Netbanking)
    User->>RZP_JS: Completes test payment
    RZP_JS->>UI: Callback (payment_id, order_id, signature)
    UI->>Action: verifyRazorpayPaymentAction(...)
    Action->>Action: HMAC SHA-256 validation (constant-time)
    Action->>DB: Update organization.planId & insert subscriptions audit row
    Action-->>UI: { success: true, planId: 'plus' }
    UI->>Tour: Opens Welcome & 4-Step Onboarding Tour Dialog
    User->>Tour: Skips or views 4 steps -> Sets hasCompletedOnboarding: true
```

---

## 2. Technical Stack & Dependencies
- **Razorpay REST API**: Direct server-to-server calls with HTTP Basic Auth (`RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET`). Zero heavy unneeded npm packages.
- **Frontend SDK**: Dynamic script loading of `https://checkout.razorpay.com/v1/checkout.js`.
- **Database**: Drizzle ORM schema additions (`organizations` plan fields + `subscriptions` audit table).
- **Security**: Node.js `crypto` HMAC SHA-256 signature verification with `timingSafeEqual`.
- **Math**: `decimal.js` for financial calculations in rupees and paise.

---

## 3. Phased Implementation Sequence

### Phase 1: Environment & Secrets Configuration
- Configure `.env.local` and `.env.example` with Razorpay test keys (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).

### Phase 2: Database Schema & Subscriptions Table
- Update `organizations` table in `src/db/schema.ts` with `planId`, `subscriptionStatus`, `subscriptionPeriod`, `subscriptionEndsAt`, `hasCompletedOnboarding`.
- Create `subscriptions` audit table in `src/db/schema.ts`.
- Push schema changes to Neon database (`npx drizzle-kit push`).

### Phase 3: Razorpay Server Library & Actions
- Create `src/lib/razorpay.ts` (API client for Orders, Payment Links, and Signature verification).
- Create/update `src/actions/subscription-actions.ts`:
  - `createRazorpaySubscriptionOrderAction`
  - `verifyRazorpayPaymentAction`
  - `handlePaymentFailureAction`
  - `completeOnboardingAction`
  - `getOrganizationSubscriptionStatusAction`

### Phase 4: Feature Gating & Entitlements
- Create `src/lib/feature-gate.ts` with permission matrix (Branch count, invoice limits, workshop lab, multi-branch analytics).
- Build `<PlanUpgradeGate>` and `<UpgradeModal>` components.

### Phase 5: Client Checkout Integration & Pricing UI
- Build `useRazorpayCheckout` hook / utility.
- Upgrade `src/app/pricing/page.tsx` with live checkout triggers, loading spinners, and failure recovery.
- Add `<SubscriberOnboardingModal>` (Lovable 4-step guided tour with skip option).

### Phase 6: Webhook Integration (Eventual Consistency)
- Create `/api/webhooks/razorpay/route.ts` with HMAC signature validation for `payment.captured`, `order.paid`, `payment.failed`.

### Phase 7: Verification & Quality Gate
- `npm run check` (TypeScript + ESLint).
- `npm run audit:security` (Security debt scan).
- `graphify update .` (Knowledge graph refresh).
