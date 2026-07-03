// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useSession } from '../../funnel/hooks/useSession';
import { getSupabase } from '../../funnel/lib/supabaseClient';
import {
  fetchMyPlan,
  openBillingPortal,
  type MyPlan,
} from '../../funnel/lib/apiClient';
import { PlanCard } from '../../funnel/components/PlanCard';

type CheckoutStatus = 'success' | 'cancel' | undefined;

export const Route = createFileRoute('/billing')({
  component: BillingPage,
  validateSearch: (s: Record<string, unknown>): { checkout?: CheckoutStatus } => ({
    checkout:
      s.checkout === 'success' || s.checkout === 'cancel'
        ? (s.checkout as CheckoutStatus)
        : undefined,
  }),
});

/** Human-readable plan name for the usage summary. */
function planLabel(plan: MyPlan): string {
  if (plan.plan !== 'pro') return 'Free plan';
  return plan.tier === 'pro' ? 'Pro plan' : 'Standard plan';
}

function BillingPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { checkout } = Route.useSearch();
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingErr, setBillingErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/signin', search: { next: '/billing' } });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (session) {
      fetchMyPlan().then(setPlan).catch(e => setPlanErr(String(e)));
    }
  }, [session]);

  const dismissCheckoutBanner = () => {
    navigate({ to: '/billing', search: {}, replace: true });
  };

  // Free users pick a tier on the dedicated /pricing comparison page.
  const handleUpgrade = () => {
    navigate({ to: '/pricing' });
  };

  const handleManage = async () => {
    setBillingBusy(true);
    setBillingErr(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      setBillingErr(e instanceof Error ? e.message : String(e));
      setBillingBusy(false);
    }
  };

  if (loading || !session) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-ink-faint font-mono text-sm">Loading…</p>
      </main>
    );
  }

  const isPro = plan?.plan === 'pro';

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      {/* Nav */}
      <header className="border-b border-rule px-6 py-3 flex items-center justify-between bg-vellum">
        <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-ink">
          <svg className="w-4 h-4 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-blueprint">CAD</span></span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/me" className="font-mono text-xs text-ink-soft hover:text-ink tracking-wide no-underline">
            Your projects
          </a>
          <span className="font-mono text-xs text-ink-soft tracking-wide hidden sm:inline">{session.user.email}</span>
          <button
            type="button"
            onClick={() => {
              // onAuthStateChange clears the session; the !session effect above
              // then redirects to /signin.
              void getSupabase().auth.signOut();
            }}
            className="rounded-md border border-rule px-3 py-1.5 font-mono text-xs tracking-wide text-ink-soft hover:border-ink hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="px-6 py-10 max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl font-medium text-ink">Usage &amp; billing</h1>
          <a href="/pricing" className="font-mono text-xs text-blueprint hover:text-ink no-underline shrink-0">
            Compare all plans →
          </a>
        </div>
        <p className="text-ink-soft mt-2 mb-8">
          Your plan, generation usage, and payment settings.
        </p>

        {checkout === 'success' && (
          <div role="status" className="mb-6 rounded-lg border border-blueprint bg-vellum-soft p-4 text-ink relative">
            <button type="button" onClick={dismissCheckoutBanner} aria-label="Dismiss" className="absolute top-3 right-3 text-ink-faint hover:text-ink font-mono text-sm leading-none">×</button>
            <p className="font-serif font-medium">You're on Pro</p>
            <p className="text-sm text-ink-soft mt-1">Subscription active — generate as much as you like.</p>
          </div>
        )}
        {checkout === 'cancel' && (
          <div role="status" className="mb-6 rounded-lg border border-rule bg-vellum-soft p-4 text-ink relative">
            <button type="button" onClick={dismissCheckoutBanner} aria-label="Dismiss" className="absolute top-3 right-3 text-ink-faint hover:text-ink font-mono text-sm leading-none">×</button>
            <p className="font-serif font-medium">Checkout cancelled</p>
            <p className="text-sm text-ink-soft mt-1">No charge was made. You can upgrade any time from this page.</p>
          </div>
        )}

        {plan && (
          <PlanCard
            plan={plan.plan}
            tier={plan.tier}
            generationsRemaining={plan.generationsRemaining}
            currentPeriodEnd={plan.currentPeriodEnd}
            onUpgrade={handleUpgrade}
            onManage={handleManage}
            busy={billingBusy}
          />
        )}
        {planErr && !plan && (
          <p className="text-ink-faint font-mono text-xs">Couldn't load plan info: {planErr}</p>
        )}
        {billingErr && (
          <p className="text-copper font-mono text-xs mt-2">Billing error: {billingErr}</p>
        )}

        {/* Usage detail */}
        {plan && (
          <section aria-label="Usage" className="mt-6 rounded-xl border border-rule bg-white p-5">
            <h2 className="font-serif text-lg font-medium text-ink">This period</h2>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <dt className="font-mono text-[11px] text-ink-faint tracking-wide uppercase">Plan</dt>
                <dd className="text-ink mt-1">{planLabel(plan)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] text-ink-faint tracking-wide uppercase">Generations</dt>
                <dd className="text-ink mt-1">
                  {isPro ? 'Unlimited' : `${plan.generationsRemaining} remaining`}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] text-ink-faint tracking-wide uppercase">
                  {isPro ? 'Renews' : 'Resets'}
                </dt>
                <dd className="text-ink mt-1">
                  {plan.currentPeriodEnd
                    ? new Date(plan.currentPeriodEnd).toLocaleDateString()
                    : isPro ? '—' : 'monthly'}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </section>
    </main>
  );
}
