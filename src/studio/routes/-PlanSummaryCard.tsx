// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ReactNode } from 'react';
import type { MyPlan } from '../../funnel/lib/apiClient';

export interface PlanSummaryCardProps {
  plan: MyPlan | null;
  planErr: string | null;
}

/** Compact plan summary for the /me page — full usage & billing lives on
 *  /billing. */
export function PlanSummaryCard({ plan, planErr }: PlanSummaryCardProps): ReactNode {
  return (
    <>
      {plan && (
        <a
          href="/billing"
          className="flex items-center justify-between gap-4 rounded-xl border border-rule bg-white p-4 no-underline hover:border-ink transition-colors"
        >
          <div>
            <p className="font-serif font-medium text-ink text-sm">
              {plan.plan === 'pro'
                ? plan.tier === 'pro'
                  ? 'Pro plan'
                  : 'Basic plan'
                : 'Free plan'}
            </p>
            <p className="font-mono text-[11px] text-ink-faint mt-1 tracking-wide">
              {plan.plan === 'pro'
                ? plan.tokensBudget
                  ? `${((plan.tokensRemaining ?? 0) / 1_000_000).toFixed(1)}M tokens left this month`
                  : 'Token-metered plan'
                : `${plan.generationsRemaining ?? 0} generation${(plan.generationsRemaining ?? 0) === 1 ? '' : 's'} remaining`}
            </p>
          </div>
          <span className="font-mono text-xs text-blueprint shrink-0">Usage &amp; billing →</span>
        </a>
      )}
      {planErr && !plan && (
        <p className="text-ink-faint font-mono text-xs">
          Couldn't load plan info: {planErr}
        </p>
      )}
    </>
  );
}
