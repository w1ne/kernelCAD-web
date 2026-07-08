// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { createCheckoutSession, fetchMyPlan, type BillingPeriod, type MyPlan, type PaidTier } from '../../funnel/lib/apiClient';
import { PricingSection } from '../../funnel/components/PricingSection';

const PAID_TIERS: readonly PaidTier[] = ['basic', 'pro'];

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  // `?buy=basic|pro` (optionally `&period=yearly`) lets the marketing landing
  // deep-link straight into checkout — one click from kernelcad.com to Stripe,
  // instead of re-showing the pricing wall. Unknown values are ignored.
  validateSearch: (s: Record<string, unknown>): { buy?: PaidTier; period?: BillingPeriod } => ({
    buy: PAID_TIERS.includes(s.buy as PaidTier) ? (s.buy as PaidTier) : undefined,
    period: s.period === 'yearly' || s.period === 'monthly' ? (s.period as BillingPeriod) : undefined,
  }),
});

function PricingPage() {
  const { session, loading } = useOptionalSession();
  const navigate = useNavigate();
  const { buy, period: buyPeriod } = Route.useSearch();
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [autoBuyFired, setAutoBuyFired] = useState(false);

  useEffect(() => {
    if (session) fetchMyPlan().then(setPlan).catch(() => {});
  }, [session]);

  const handleSelect = async (tier: PaidTier, selectedPeriod: BillingPeriod) => {
    if (!session) {
      // Preserve the intent across sign-in so the round-trip lands back here and
      // auto-fires checkout, rather than dropping the user on a bare pricing page.
      const next = `/pricing?buy=${tier}&period=${selectedPeriod}`;
      navigate({ to: '/signin', search: { next } });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { url } = await createCheckoutSession(tier, selectedPeriod);
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  // Deep-link from the landing: auto-start checkout for `?buy=`. Fires once.
  useEffect(() => {
    // Wait for the session to resolve so a logged-in user isn't bounced to
    // sign-in just because auth hadn't loaded yet.
    if (buy && !autoBuyFired && !loading) {
      setAutoBuyFired(true);
      void handleSelect(buy, buyPeriod ?? 'monthly');
    }
    // handleSelect is stable enough for this one-shot trigger; deps kept minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buy, buyPeriod, autoBuyFired, session, loading]);

  const handleFree = () => {
    navigate({ to: session ? '/' : '/signin', ...(session ? {} : { search: { next: '/' } }) });
  };

  return (
    <main className="min-h-screen bg-[#F4ECD7] text-[#0A1628] font-sans">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-[#0A1628]">
          <svg className="w-4 h-4 text-[#0A1628]" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-[#1E5FA8]">CAD</span></span>
        </a>
        <a
          href={session ? '/billing' : '/signin'}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#3F4C5E] hover:text-[#0A1628] no-underline transition-colors"
        >
          {session ? 'Billing' : 'Log in'}
        </a>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <h1 className="text-center font-serif text-5xl font-bold tracking-tight text-[#0A1628]">Pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-[#3F4C5E]">
          A monthly token allowance for the parametric build agent — a tiny cube costs a sliver, a big assembly costs more. Cancel anytime.
        </p>

        <div className="mt-8">
          <PricingSection
            hideHeading
            initialPeriod={buyPeriod ?? 'monthly'}
            currentPlan={plan?.plan}
            currentTier={plan?.tier}
            onSelect={handleSelect}
            onFree={handleFree}
            busy={busy}
            error={err}
          />
        </div>

        <p className="mt-10 text-center text-xs text-[#97A0AC]">
          Prices in USD. Cancel anytime. Failed generations don't count against your quota.
        </p>
      </section>
    </main>
  );
}
