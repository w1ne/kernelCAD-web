// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// /pricing?buy=&src=: the deep link auto-starts checkout and sends the
// allow-listed `src` as `source`; anything else is dropped.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';

const h = vi.hoisted(() => ({
  options: undefined as undefined | { component: ComponentType; validateSearch: (s: Record<string, unknown>) => Record<string, unknown> },
  search: {} as Record<string, unknown>,
  createCheckoutSession: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: NonNullable<typeof h.options>) => {
    h.options = options;
    return { options, useSearch: () => h.search };
  },
  useNavigate: () => h.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('../../funnel/hooks/useSession', () => ({
  useOptionalSession: () => ({ session: { user: { email: 'a@b.c' } }, loading: false }),
}));
vi.mock('../../funnel/lib/apiClient', () => ({
  createCheckoutSession: h.createCheckoutSession,
  fetchMyPlan: vi.fn().mockResolvedValue({ plan: 'free' }),
}));
vi.mock('../../funnel/components/FunnelHeader', () => ({ FunnelHeader: () => null }));
vi.mock('../../funnel/components/PricingSection', () => ({ PricingSection: () => null }));

import '../routes/pricing';

afterEach(() => {
  cleanup();
  h.createCheckoutSession.mockReset();
});

describe('/pricing ?src=', () => {
  it('validateSearch keeps only [\\w-]{1,32} as src and valid buy tiers', () => {
    const v = h.options!.validateSearch;
    expect(v({ buy: 'pro', src: 'quota-banner_2' })).toMatchObject({ buy: 'pro', src: 'quota-banner_2' });
    expect(v({ buy: 'basic', src: 'a b' }).src).toBeUndefined();
    expect(v({ src: 'x'.repeat(33) }).src).toBeUndefined();
    expect(v({ src: '<script>' }).src).toBeUndefined();
    expect(v({ buy: 'gold' }).buy).toBeUndefined();
  });

  it('sends source in the create-checkout call for ?buy=pro&src=quota', async () => {
    h.search = { buy: 'pro', src: 'quota' };
    h.createCheckoutSession.mockReturnValue(new Promise(() => {}));
    const Page = h.options!.component;
    render(<Page />);
    await waitFor(() => expect(h.createCheckoutSession).toHaveBeenCalledWith('pro', 'monthly', 'quota'));
  });
});
