// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { createCheckoutSession, fetchMyPlan, type MyPlan, type PaidTier } from '../../funnel/lib/apiClient';
import { PricingTiers } from '../../funnel/components/PricingTiers';

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
});

function PricingPage() {
  const { session } = useOptionalSession();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (session) fetchMyPlan().then(setPlan).catch(() => {});
  }, [session]);

  const handleSelect = async (tier: PaidTier) => {
    if (!session) {
      navigate({ to: '/signin', search: { next: '/pricing' } });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { url } = await createCheckoutSession(tier);
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const handleFree = () => {
    navigate({ to: session ? '/' : '/signin', ...(session ? {} : { search: { next: '/' } }) });
  };

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white font-sans">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-white">
          <svg className="w-4 h-4 text-white" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-blue-400">CAD</span></span>
        </a>
        <a
          href={session ? '/billing' : '/signin'}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white no-underline transition-colors"
        >
          {session ? 'Billing' : 'Log in'}
        </a>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <h1 className="text-center font-serif text-5xl font-bold tracking-tight">Pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
          Start free. Upgrade when you want unlimited generations and the parametric build agent.
        </p>

        {/* Billing cadence — monthly only for now (mirrors the PhotoAI toggle). */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex rounded-full bg-[#141416] p-1 ring-1 ring-[#26262b]">
            <span className="rounded-full bg-[#2a2a30] px-4 py-1.5 text-sm font-medium text-white">Monthly</span>
            <span className="cursor-not-allowed rounded-full px-4 py-1.5 text-sm text-gray-500" title="Yearly billing coming soon">
              Yearly · soon
            </span>
          </div>
        </div>

        {err && (
          <p className="mt-6 text-center font-mono text-xs text-red-400">Checkout error: {err}</p>
        )}

        <div className="mt-12">
          <PricingTiers
            currentPlan={plan?.plan}
            currentTier={plan?.tier}
            onSelect={handleSelect}
            onFree={handleFree}
            busy={busy}
          />
        </div>

        <p className="mt-10 text-center text-xs text-gray-500">
          Prices in USD. Cancel anytime. Failed generations don't count against your quota.
        </p>
      </section>
    </main>
  );
}
