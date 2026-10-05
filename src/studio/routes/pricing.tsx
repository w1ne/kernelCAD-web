// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { createCheckoutSession, fetchMyPlan, type BillingPeriod, type MyPlan, type PaidTier } from '../../funnel/lib/apiClient';
import { FunnelHeader } from '../../funnel/components/FunnelHeader';
import { PricingSection } from '../../funnel/components/PricingSection';
import { buttonClass } from '../../ui';

/** `?src=` attribution tag: short, word characters and dashes only. */
const SRC_PATTERN = /^[\w-]{1,32}$/;

const PAID_TIERS: readonly PaidTier[] = ['basic', 'pro'];

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  // `?buy=basic|pro` (optionally `&period=yearly`) lets the marketing landing
  // deep-link straight into checkout — one click from kernelcad.com to Stripe,
  // instead of re-showing the pricing wall. Unknown values are ignored.
  validateSearch: (s: Record<string, unknown>): { buy?: PaidTier; period?: BillingPeriod; src?: string } => ({
    buy: PAID_TIERS.includes(s.buy as PaidTier) ? (s.buy as PaidTier) : undefined,
    period: s.period === 'yearly' || s.period === 'monthly' ? (s.period as BillingPeriod) : undefined,
    src: typeof s.src === 'string' && SRC_PATTERN.test(s.src) ? s.src : undefined,
  }),
});

function PricingPage() {
  const { session, loading } = useOptionalSession();
  const navigate = useNavigate();
  const { buy, period: buyPeriod, src } = Route.useSearch();
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
      const next = `/pricing?buy=${tier}&period=${selectedPeriod}${src ? `&src=${src}` : ''}`;
      navigate({ to: '/signin', search: { next } });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { url } = await createCheckoutSession(tier, selectedPeriod, src);
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
    navigate({ to: session ? '/' : '/signin', ...(session ? {} : { search: { next: '/connect' } }) });
  };

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <FunnelHeader
        current="pricing"
        end={
          <span className="ml-1 hidden sm:inline">
            <a href={session ? '/billing' : '/signin'} className={`${buttonClass('secondary', 'md')} no-underline`}>
              {session ? 'Billing' : 'Log in'}
            </a>
          </span>
        }
      />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-center font-serif text-[40px] leading-[1.05] font-medium tracking-tight text-fg sm:text-[56px]">
          Pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-body text-fg-2">
          Plans are a monthly token allowance for the built-in build agent. A small part uses a little; a big assembly
          uses more. Cancel anytime.
        </p>

        <section
          aria-labelledby="free-path"
          className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-panel border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div>
            <h2 id="free-path" className="text-body font-semibold text-fg">
              Free: bring your own agent
            </h2>
            <p className="mt-1 text-ui text-fg-2">
              Connect ChatGPT, Claude, Claude Code or Codex. Modeling, checks and review through your own agent cost
              nothing here; you only use your agent&apos;s own plan.
            </p>
          </div>
          <a href="/connect" className={`${buttonClass('secondary', 'lg')} shrink-0 no-underline`}>
            Connect your agent
          </a>
        </section>

        <div className="mt-4">
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

        <p className="mt-10 text-center text-ui text-fg-3">
          Prices in USD. Cancel anytime. Failed generations don&apos;t count against your quota.
        </p>
      </main>
    </div>
  );
}
