// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Characterisation tests for the /billing route component. The route module
// only exports `Route`, so the mocked `createFileRoute` captures the component
// under test while `useSearch`/`useNavigate` stay router-free.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';

const routerMock = vi.hoisted(() => ({
    search: {} as { checkout?: 'success' | 'cancel' },
    navigate: vi.fn(),
    page: undefined as ComponentType | undefined,
}));

const mocks = vi.hoisted(() => ({
    useSession: vi.fn(),
    fetchMyPlan: vi.fn(),
    openBillingPortal: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
    createFileRoute: () => (options: { component: ComponentType }) => {
        routerMock.page = options.component;
        return { options, useSearch: () => routerMock.search };
    },
    useNavigate: () => routerMock.navigate,
}));

vi.mock('../../funnel/hooks/useSession', () => ({
    useSession: mocks.useSession,
}));

vi.mock('../../funnel/lib/supabaseClient', () => ({
    getSupabase: () => ({ auth: { signOut: vi.fn() } }),
}));

vi.mock('../../funnel/lib/apiClient', () => ({
    fetchMyPlan: mocks.fetchMyPlan,
    openBillingPortal: mocks.openBillingPortal,
}));

import '../routes/billing';

function renderBillingPage() {
    const Page = routerMock.page;
    if (!Page) throw new Error('billing route did not register a component');
    return render(<Page />);
}

const freePlan = {
    plan: 'free',
    tier: null,
    generationsRemaining: 3,
    tokensUsed: null,
    tokensBudget: null,
    currentPeriodEnd: null,
};

const proPlan = {
    plan: 'pro',
    tier: 'pro',
    generationsRemaining: null,
    tokensUsed: 2_500_000,
    tokensBudget: 12_000_000,
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
};

beforeEach(() => {
    routerMock.search = {};
    routerMock.navigate.mockClear();
    mocks.useSession.mockReset();
    mocks.fetchMyPlan.mockReset();
    mocks.openBillingPortal.mockReset();
});

afterEach(() => {
    cleanup();
});

describe('BillingPage', () => {
    it('shows the loading placeholder while the session resolves', () => {
        mocks.useSession.mockReturnValue({ session: null, loading: true });
        renderBillingPage();
        expect(screen.getByText('Loading…')).toBeDefined();
    });

    it('redirects signed-out visitors to /signin', () => {
        mocks.useSession.mockReturnValue({ session: null, loading: false });
        renderBillingPage();
        expect(routerMock.navigate).toHaveBeenCalledWith({
            to: '/signin',
            search: { next: '/billing' },
        });
    });

    it('renders the free-plan summary and cancel banner', async () => {
        routerMock.search.checkout = 'cancel';
        mocks.useSession.mockReturnValue({
            session: { user: { email: 'jane@example.com' } },
            loading: false,
        });
        mocks.fetchMyPlan.mockResolvedValue(freePlan);
        renderBillingPage();

        await screen.findByLabelText('Usage');
        expect(screen.getByText('Usage & billing')).toBeDefined();
        expect(screen.getByText('jane@example.com')).toBeDefined();
        expect(screen.getByText('Checkout cancelled')).toBeDefined();
        expect(screen.getAllByText('Free plan').length).toBeGreaterThan(0);
        expect(screen.getByText('3 remaining')).toBeDefined();
        expect(screen.getByText('Resets')).toBeDefined();
        expect(screen.getByText('monthly')).toBeDefined();
        expect(screen.getByText('Upgrade — $19/mo')).toBeDefined();
    });

    it('renders the pro-plan summary and success banner', async () => {
        routerMock.search.checkout = 'success';
        mocks.useSession.mockReturnValue({
            session: { user: { email: 'jane@example.com' } },
            loading: false,
        });
        mocks.fetchMyPlan.mockResolvedValue(proPlan);
        renderBillingPage();

        await screen.findByText("You're on Pro");
        expect(screen.getByText('Manage subscription')).toBeDefined();
        expect(screen.getByText('Unlimited')).toBeDefined();
        expect(screen.getByText('Renews')).toBeDefined();
    });

    it('renders the plan-load error when fetchMyPlan rejects', async () => {
        mocks.useSession.mockReturnValue({
            session: { user: { email: 'jane@example.com' } },
            loading: false,
        });
        mocks.fetchMyPlan.mockRejectedValue(new Error('boom'));
        renderBillingPage();

        await screen.findByText("Couldn't load plan info: Error: boom");
    });

    it('renders the billing error when the portal call rejects', async () => {
        mocks.useSession.mockReturnValue({
            session: { user: { email: 'jane@example.com' } },
            loading: false,
        });
        mocks.fetchMyPlan.mockResolvedValue(proPlan);
        mocks.openBillingPortal.mockRejectedValue(new Error('portal down'));
        renderBillingPage();

        fireEvent.click(await screen.findByText('Manage subscription'));
        await screen.findByText('Billing error: portal down');
    });
});
