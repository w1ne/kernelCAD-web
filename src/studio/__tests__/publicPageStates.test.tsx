// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Loading, not-found, timeout and error states of the public /p/<slug> and
// /g/<genId> pages. The mocked `createFileRoute` captures each route's
// component; the Studio itself is a stub that shows the props it received.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';

const routerMock = vi.hoisted(() => ({
    params: {} as Record<string, string>,
    pages: {} as Record<string, ComponentType>,
    navigate: vi.fn(),
}));

const api = vi.hoisted(() => ({
    fetchProjectBySlug: vi.fn(),
    fetchGeneration: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
    createFileRoute: (path: string) => (options: { component: ComponentType }) => {
        routerMock.pages[path] = options.component;
        return { options, useParams: () => routerMock.params };
    },
    useNavigate: () => routerMock.navigate,
}));

vi.mock('../App', () => ({
    default: ({ projectName, initialCode }: { projectName?: string; initialCode?: string }) => (
        <div data-testid="studio-app" data-project-name={projectName ?? ''} data-code={initialCode ?? ''} />
    ),
}));

vi.mock('../../funnel/lib/apiClient', () => ({
    fetchProjectBySlug: api.fetchProjectBySlug,
    fetchGeneration: api.fetchGeneration,
    saveProject: vi.fn(),
    claimProject: vi.fn(),
    createCheckoutSession: vi.fn(),
    postProjectRender: vi.fn(() => Promise.resolve()),
    setProjectPrivacy: vi.fn(),
    PRIVATE_REQUIRES_PAID: 'private_requires_paid_account',
}));

vi.mock('../../funnel/hooks/useSession', () => ({
    useOptionalSession: () => ({ session: null, loading: false }),
}));
vi.mock('../../funnel/components/SignInButton', () => ({ SignInButton: () => null }));
vi.mock('../components/MadeWithKernelcad', () => ({ MadeWithKernelcad: () => null }));
vi.mock('../routes/-ProjectClaimControl', () => ({ ProjectClaimControl: () => null, AnonProjectBanner: () => null }));
vi.mock('../routes/-ProjectViewerActions', () => ({ ProjectViewerActions: () => null }));
vi.mock('../routes/-ServerRevisionHistory', () => ({ ServerRevisionHistory: () => null }));
vi.mock('../customizer/StudioModelCustomizer', () => ({ StudioModelCustomizer: () => null }));
vi.mock('../components/viewer/captureViewerPng', () => ({ captureViewerPngBase64: () => null }));

import '../routes/p.$slug';
import '../routes/g.$genId';
import { LOAD_SLOW_MS, LOAD_TIMEOUT_MS } from '../routes/-useProjectLiveUpdates';

class FakeEventSource {
    addEventListener(): void {}
    close(): void {}
}

function renderPage(path: '/p/$slug' | '/g/$genId', params: Record<string, string>) {
    routerMock.params = params;
    const Page = routerMock.pages[path];
    if (!Page) throw new Error(`${path} route did not register a component`);
    return render(<Page />);
}

function linkHrefs(): string[] {
    return screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '');
}

const ROW = {
    id: 'p1',
    slug: 'pipe-clamp',
    title: 'Pipe clamp bracket',
    privacy: 'public_unlisted',
    current_code: 'return box(10, 10, 10);',
    parameters: [],
    version: 1,
    updated_at: '2026-09-29T00:00:00.000Z',
    owner_id: null,
};

const GEN_ID = '00000000-0000-4000-8000-000000000000';

beforeEach(() => {
    api.fetchProjectBySlug.mockReset();
    api.fetchGeneration.mockReset();
    vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('/p/<slug> page states', () => {
    it('shows a not-found page with next steps for a missing or private slug', async () => {
        api.fetchProjectBySlug.mockResolvedValue(null);
        renderPage('/p/$slug', { slug: 'does-not-exist' });

        expect(await screen.findByText('This project does not exist or is private')).toBeTruthy();
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(linkHrefs()).toEqual(expect.arrayContaining(['/gallery', '/me', '/']));
        expect(screen.queryByText(/Loading/)).toBeNull();
    });

    it('says a hung request is slow, then offers a retry when it times out', async () => {
        vi.useFakeTimers();
        api.fetchProjectBySlug.mockReturnValueOnce(new Promise(() => {}));
        renderPage('/p/$slug', { slug: 'pipe-clamp' });
        expect(screen.getByText('Loading the project…')).toBeTruthy();

        act(() => vi.advanceTimersByTime(LOAD_SLOW_MS));
        expect(screen.getByText(/takes longer than usual/)).toBeTruthy();

        act(() => vi.advanceTimersByTime(LOAD_TIMEOUT_MS - LOAD_SLOW_MS));
        expect(screen.getByText('The project did not load')).toBeTruthy();

        api.fetchProjectBySlug.mockResolvedValueOnce(ROW);
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        });
        expect(api.fetchProjectBySlug).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('studio-app')).toBeTruthy();
    });

    it('shows a failed request with its cause and a retry', async () => {
        api.fetchProjectBySlug.mockRejectedValue(new Error('JWT expired'));
        renderPage('/p/$slug', { slug: 'pipe-clamp' });

        expect(await screen.findByText('Could not load this project')).toBeTruthy();
        expect(screen.getByTestId('page-state-detail').textContent).toContain('JWT expired');
        expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    });

    it('opens the Studio named after the project title', async () => {
        api.fetchProjectBySlug.mockResolvedValue(ROW);
        renderPage('/p/$slug', { slug: 'pipe-clamp' });

        const app = await screen.findByTestId('studio-app');
        expect(app.getAttribute('data-project-name')).toBe('Pipe clamp bracket');
    });
});

describe('/g/<genId> page states', () => {
    it('shows a not-found page for a generation id with no row', async () => {
        api.fetchGeneration.mockResolvedValue(null);
        renderPage('/g/$genId', { genId: GEN_ID });

        expect(await screen.findByText('This generation does not exist')).toBeTruthy();
        expect(linkHrefs()).toEqual(expect.arrayContaining(['/generate', '/gallery']));
    });

    it('rejects a malformed id without a request', () => {
        renderPage('/g/$genId', { genId: 'not-a-uuid' });

        expect(screen.getByText('This generation link is not valid')).toBeTruthy();
        expect(api.fetchGeneration).not.toHaveBeenCalled();
    });

    it('lets the visitor refresh a generation that is still running', async () => {
        api.fetchGeneration
            .mockResolvedValueOnce({ id: GEN_ID, status: 'running', code: null, prompt: 'bracket' })
            .mockResolvedValueOnce({ id: GEN_ID, status: 'done', code: 'return box(1, 1, 1);', prompt: 'bracket' });
        renderPage('/g/$genId', { genId: GEN_ID });

        expect(await screen.findByText('The model is still generating')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => expect(screen.getByTestId('studio-app')).toBeTruthy());
        expect(api.fetchGeneration).toHaveBeenCalledTimes(2);
    });

    it('explains a failed generation and links to a new prompt', async () => {
        api.fetchGeneration.mockResolvedValue({
            id: GEN_ID,
            status: 'gate_failed',
            code: null,
            prompt: 'bracket',
            diagnostics: { message: 'The model failed its geometry checks.' },
        });
        renderPage('/g/$genId', { genId: GEN_ID });

        expect(await screen.findByText('This generation did not produce a model')).toBeTruthy();
        expect(screen.getByText('The model failed its geometry checks.')).toBeTruthy();
        expect(linkHrefs()).toContain('/generate');
    });
});
