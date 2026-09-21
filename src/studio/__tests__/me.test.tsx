// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Characterisation tests for the /me route component. The route module only
// exports `Route`, so the mocked `createFileRoute` captures the component under
// test while `useSearch`/`useNavigate` stay router-free.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';

const routerMock = vi.hoisted(() => ({
    search: {} as { checkout?: 'success' | 'cancel' },
    navigate: vi.fn(),
    page: undefined as ComponentType | undefined,
}));

const mocks = vi.hoisted(() => ({
    useMePageData: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
    createFileRoute: () => (options: { component: ComponentType }) => {
        routerMock.page = options.component;
        return { options, useSearch: () => routerMock.search };
    },
    useNavigate: () => routerMock.navigate,
}));

vi.mock('../routes/-useMePageData', () => ({
    useMePageData: mocks.useMePageData,
}));

vi.mock('../routes/-PlanSummaryCard', () => ({
    PlanSummaryCard: () => <div data-testid="plan-summary-card" />,
}));

vi.mock('../../funnel/lib/supabaseClient', () => ({
    getSupabase: () => ({ auth: { signOut: vi.fn() } }),
}));

import '../routes/me';

function renderMePage() {
    const Page = routerMock.page;
    if (!Page) throw new Error('me route did not register a component');
    return render(<Page />);
}

const session = { user: { email: 'jane@example.com' } };

const projects = [
    {
        id: 'p1',
        slug: 'widget',
        title: 'Widget',
        privacy: 'private',
        updated_at: '2026-01-15T00:00:00.000Z',
    },
];

beforeEach(() => {
    routerMock.search = {};
    routerMock.navigate.mockClear();
    mocks.useMePageData.mockReset();
});

afterEach(() => {
    cleanup();
});

describe('MePage', () => {
    it('shows the loading placeholder while the session resolves', () => {
        mocks.useMePageData.mockReturnValue({
            session: null, loading: true, projects: null, plan: null, planErr: null, err: null,
        });
        renderMePage();
        expect(screen.getByText('Loading…')).toBeDefined();
    });

    it('renders the load error', () => {
        mocks.useMePageData.mockReturnValue({
            session, loading: false, projects: null, plan: null, planErr: null, err: 'boom',
        });
        renderMePage();
        expect(screen.getByText('Failed to load: boom')).toBeDefined();
    });

    it('renders the header, plan summary and project cards', () => {
        mocks.useMePageData.mockReturnValue({
            session, loading: false, projects, plan: null, planErr: null, err: null,
        });
        const { container } = renderMePage();

        expect(screen.getByText('jane@example.com')).toBeDefined();
        expect(screen.getByText('Sign out')).toBeDefined();
        expect(screen.getByTestId('plan-summary-card')).toBeDefined();
        expect(screen.getByText('Your projects')).toBeDefined();
        expect(screen.getByText('Widget')).toBeDefined();
        expect(screen.getByText('Copy link')).toBeDefined();
        const date = new Date('2026-01-15T00:00:00.000Z').toLocaleDateString();
        expect(screen.getByText(`private · ${date}`)).toBeDefined();
        expect(container.querySelector('a[href="/p/widget"]')).not.toBeNull();
    });

    it('renders the empty-projects prompt', () => {
        mocks.useMePageData.mockReturnValue({
            session, loading: false, projects: [], plan: null, planErr: null, err: null,
        });
        renderMePage();
        expect(screen.getByText('Start one')).toBeDefined();
    });

    it('renders the success checkout banner and dismisses it', () => {
        routerMock.search.checkout = 'success';
        mocks.useMePageData.mockReturnValue({
            session, loading: false, projects, plan: null, planErr: null, err: null,
        });
        renderMePage();

        expect(screen.getByText("You're on Pro")).toBeDefined();
        expect(screen.getByText('Subscription active — generate as much as you like.')).toBeDefined();

        fireEvent.click(screen.getByLabelText('Dismiss'));
        expect(routerMock.navigate).toHaveBeenCalledWith({ to: '/me', search: {}, replace: true });
    });

    it('renders the cancel checkout banner', () => {
        routerMock.search.checkout = 'cancel';
        mocks.useMePageData.mockReturnValue({
            session, loading: false, projects, plan: null, planErr: null, err: null,
        });
        renderMePage();

        expect(screen.getByText('Checkout cancelled')).toBeDefined();
        expect(screen.getByText('No charge was made. You can upgrade any time from this page.')).toBeDefined();
    });
});
