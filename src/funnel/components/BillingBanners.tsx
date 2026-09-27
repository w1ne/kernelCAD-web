// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { MyPlan } from '../lib/apiClient';
import { paidTierOf, tierName } from '../lib/planLabels';
import type { CheckoutStatus } from '../lib/checkoutStatus';

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss"
      className="absolute top-3 right-3 text-ink-faint hover:text-ink font-mono text-sm leading-none"
    >
      ×
    </button>
  );
}

/**
 * Banner shown after Stripe Checkout returns to /billing?checkout=success|cancel.
 * The success title names the ACTUAL plan from /me/plan. Access is granted by
 * the webhook, which can land after the redirect: until the plan reads as paid,
 * the banner says the subscription is activating.
 */
export function CheckoutBanner({
  checkout,
  plan,
  onDismiss,
}: {
  checkout: CheckoutStatus;
  plan: MyPlan | null;
  onDismiss: () => void;
}) {
  if (checkout === 'success') {
    const tier = plan ? paidTierOf(plan) : null;
    return (
      <div role="status" className="mb-6 rounded-lg border border-blueprint bg-vellum-soft p-4 text-ink relative">
        <DismissButton onDismiss={onDismiss} />
        <p className="font-serif font-medium">
          {tier ? `You're on ${tierName(tier)}` : 'Payment received'}
        </p>
        <p className="text-sm text-ink-soft mt-1">
          {tier
            ? 'Subscription active. Your monthly token budget is shown below.'
            : 'Your subscription is activating. This can take a few seconds; refresh if your plan still shows Free.'}
        </p>
      </div>
    );
  }
  if (checkout === 'cancel') {
    return (
      <div role="status" className="mb-6 rounded-lg border border-rule bg-vellum-soft p-4 text-ink relative">
        <DismissButton onDismiss={onDismiss} />
        <p className="font-serif font-medium">Checkout cancelled</p>
        <p className="text-sm text-ink-soft mt-1">No charge was made. You can upgrade any time from this page.</p>
      </div>
    );
  }
  return null;
}

/**
 * A renewal charge failed (subscription `past_due` / `unpaid`). The user keeps
 * access while Stripe retries and emails them; this points them at the portal
 * to fix the card.
 */
export function PaymentFailedBanner({
  onUpdateCard,
  busy = false,
}: {
  onUpdateCard: () => void;
  busy?: boolean;
}) {
  return (
    <div role="alert" className="mb-6 rounded-lg border border-copper bg-vellum-soft p-4 text-ink flex items-center justify-between gap-4">
      <div>
        <p className="font-serif font-medium">Payment failed: update your card</p>
        <p className="text-sm text-ink-soft mt-1">
          We could not charge your card for the renewal. Stripe will retry. Update your payment method to keep your plan.
        </p>
      </div>
      <button
        type="button"
        onClick={onUpdateCard}
        disabled={busy}
        className="shrink-0 rounded-md bg-copper px-4 py-2 font-mono text-xs tracking-wide text-white hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Loading…' : 'Update payment method'}
      </button>
    </div>
  );
}
