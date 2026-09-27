// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { MyPlan, PaidTier } from './apiClient';

/**
 * One source of truth for plan names shown in the Studio (PlanCard, /billing,
 * the /me summary, the checkout banner).
 *
 * The API reports `plan: 'pro'` for ANY paid subscription and the real plan in
 * `tier`. A paid plan without a known tier (older API, legacy Standard
 * subscriber) shows as Pro, which matches the server's own fallback
 * (`tier ?? 'pro'`, legacy Standard -> Pro allowance).
 */
export function paidTierOf(plan: Pick<MyPlan, 'plan' | 'tier'>): PaidTier | null {
  if (plan.plan !== 'pro') return null;
  return plan.tier === 'basic' ? 'basic' : 'pro';
}

/** "Basic" | "Pro" */
export function tierName(tier: PaidTier): string {
  return tier === 'basic' ? 'Basic' : 'Pro';
}

/** "$19/mo" | "$39/mo" */
export function tierMonthlyPrice(tier: PaidTier): string {
  return tier === 'basic' ? '$19/mo' : '$39/mo';
}

/** "Free plan" | "Basic plan" | "Pro plan" */
export function planLabel(plan: Pick<MyPlan, 'plan' | 'tier'>): string {
  const tier = paidTierOf(plan);
  return tier ? `${tierName(tier)} plan` : 'Free plan';
}
