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

// The API reports plan:'pro' for ANY paid subscription; `tier` says which.
const basicPlan = {
    ...proPlan,
    tier: 'basic',
    tokensUsed: 1_000_000,
    tokensBudget: 5_000_000,
};

const signedIn = { session: { user: { email: 'jane@example.com' } }, loading: false };

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

    it('names the Basic plan in the success banner and the usage summary (not Pro, not Standard)', async () => {
        routerMock.search.checkout = 'success';
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchMyPlan.mockResolvedValue(basicPlan);
        renderBillingPage();

        await screen.findByText("You're on Basic");
        expect(screen.queryByText("You're on Pro")).toBeNull();
        expect(screen.queryByText('Standard plan')).toBeNull();
        // PlanCard title and the usage summary both use the shared label.
        expect(screen.getAllByText('Basic plan').length).toBe(1);
        const usage = screen.getByLabelText('Usage');
        expect(usage.textContent).toContain('Basic plan');
    });

    it('shows an activating banner (not a plan name) while the webhook has not landed yet', async () => {
        routerMock.search.checkout = 'success';
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchMyPlan.mockResolvedValue(freePlan);
        renderBillingPage();

        await screen.findByText('Payment received');
        expect(screen.queryByText("You're on Pro")).toBeNull();
    });

    it('dismissing the checkout banner clears the query', async () => {
        routerMock.search.checkout = 'cancel';
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchMyPlan.mockResolvedValue(freePlan);
        renderBillingPage();

        fireEvent.click(await screen.findByLabelText('Dismiss'));
        expect(routerMock.navigate).toHaveBeenCalledWith({ to: '/billing', search: {}, replace: true });
    });

    it('a cancelled user (free plan, Stripe customer kept) gets a Billing history & invoices button that opens the portal', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchMyPlan.mockResolvedValue({ ...freePlan, hasBillingAccount: true, subscriptionStatus: 'canceled' });
        mocks.openBillingPortal.mockResolvedValue({ url: 'https://billing.stripe.com/p/x' });
        renderBillingPage();

        const invoices = await screen.findByText('Billing history & invoices');
        expect(screen.getByText('Upgrade — $19/mo')).toBeDefined();
        fireEvent.click(invoices);
        expect(mocks.openBillingPortal).toHaveBeenCalledTimes(1);
    });

    it('a free user without a Stripe customer (or an older API without the field) sees no invoices button', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchMyPlan.mockResolvedValue(freePlan);
        renderBillingPage();

        await screen.findByText('Upgrade — $19/mo');
        expect(screen.queryByText('Billing history & invoices')).toBeNull();
    });

    it('shows the payment-failed banner with a portal button when the renewal charge failed', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchMyPlan.mockResolvedValue({ ...basicPlan, hasBillingAccount: true, subscriptionStatus: 'past_due', paymentFailed: true });
        mocks.openBillingPortal.mockResolvedValue({ url: 'https://billing.stripe.com/p/x' });
        renderBillingPage();

        await screen.findByText('Payment failed: update your card');
        expect(screen.getByRole('alert')).toBeDefined();
        fireEvent.click(screen.getByText('Update payment method'));
        expect(mocks.openBillingPortal).toHaveBeenCalledTimes(1);
    });

    it('shows no payment-failed banner for a healthy subscription or an older API response', async () => {
        mocks.useSession.mockReturnValue(signedIn);
        mocks.fetchMyPlan.mockResolvedValue(proPlan); // no paymentFailed field at all
        renderBillingPage();

        await screen.findByText('Manage subscription');
        expect(screen.queryByText('Payment failed: update your card')).toBeNull();
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
