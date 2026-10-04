// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { paidTierOf, planLabel, tierMonthlyPrice, tierName } from './planLabels';

describe('planLabels', () => {
    it('labels each plan from the actual tier', () => {
        expect(planLabel({ plan: 'free', tier: null })).toBe('Free plan');
        expect(planLabel({ plan: 'pro', tier: 'basic' })).toBe('Basic plan');
        expect(planLabel({ plan: 'pro', tier: 'pro' })).toBe('Pro plan');
    });

    it('never says Standard (the retired $20 plan)', () => {
        for (const tier of ['basic', 'pro', null, undefined] as const) {
            expect(planLabel({ plan: 'pro', tier })).not.toContain('Standard');
        }
    });

    it('a paid plan without a tier (older API, legacy subscriber) reads as Pro, like the server fallback', () => {
        expect(paidTierOf({ plan: 'pro', tier: undefined })).toBe('pro');
        expect(paidTierOf({ plan: 'pro', tier: null })).toBe('pro');
        expect(paidTierOf({ plan: 'free', tier: 'basic' })).toBeNull();
    });

    it('names and prices tiers', () => {
        expect(tierName('basic')).toBe('Basic');
        expect(tierName('pro')).toBe('Pro');
        expect(tierMonthlyPrice('basic')).toBe('$19/mo');
        expect(tierMonthlyPrice('pro')).toBe('$39/mo');
    });
});
