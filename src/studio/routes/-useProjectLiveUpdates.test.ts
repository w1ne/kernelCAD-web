// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import {
    fetchProjectBySlug,
    postProjectRender,
    setProjectPrivacy,
    PRIVATE_REQUIRES_PAID,
    type ProjectRow,
} from '../../funnel/lib/apiClient';
import { captureViewerPngBase64 } from '../components/viewer/captureViewerPng';
import { useProjectLiveUpdates, LOAD_SLOW_MS, LOAD_TIMEOUT_MS } from './-useProjectLiveUpdates';

vi.mock('../../funnel/lib/apiClient', () => ({
    fetchProjectBySlug: vi.fn(),
    postProjectRender: vi.fn(),
    setProjectPrivacy: vi.fn(),
    PRIVATE_REQUIRES_PAID: 'private_requires_paid_account',
}));

vi.mock('../components/viewer/captureViewerPng', () => ({
    captureViewerPngBase64: vi.fn(),
}));

class FakeEventSource {
    static instances: FakeEventSource[] = [];
    readonly url: string;
    closed = false;
    private listeners = new Map<string, EventListener[]>();

    constructor(url: string) {
        this.url = url;
        FakeEventSource.instances.push(this);
    }

    addEventListener(type: string, callback: EventListener): void {
        const list = this.listeners.get(type) ?? [];
        list.push(callback);
        this.listeners.set(type, list);
    }

    removeEventListener(type: string, callback: EventListener): void {
        const list = this.listeners.get(type) ?? [];
        this.listeners.set(type, list.filter((cb) => cb !== callback));
    }

    close(): void {
        this.closed = true;
    }

    emit(type: string, event: Event): void {
        for (const callback of this.listeners.get(type) ?? []) callback(event);
    }
}

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
    return {
        id: 'p1',
        slug: 'demo',
        title: 'Demo',
        privacy: 'public_unlisted',
        current_code: 'cube();',
        parameters: {},
        version: 1,
        updated_at: '2026-01-01T00:00:00.000Z',
        owner_id: null,
        ...overrides,
    };
}

function lastEventSource(): FakeEventSource {
    return FakeEventSource.instances[FakeEventSource.instances.length - 1];
}

const fetchProjectBySlugMock = vi.mocked(fetchProjectBySlug);
const postProjectRenderMock = vi.mocked(postProjectRender);
const setProjectPrivacyMock = vi.mocked(setProjectPrivacy);
const captureViewerPngBase64Mock = vi.mocked(captureViewerPngBase64);

describe('useProjectLiveUpdates', () => {
    beforeEach(() => {
        fetchProjectBySlugMock.mockReset();
        postProjectRenderMock.mockReset();
        setProjectPrivacyMock.mockReset();
        captureViewerPngBase64Mock.mockReset();
        captureViewerPngBase64Mock.mockReturnValue(null);
        FakeEventSource.instances = [];
        vi.stubGlobal('EventSource', FakeEventSource);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('loads the project row and exposes idle live-update defaults', async () => {
        fetchProjectBySlugMock.mockResolvedValue(project({ version: 3 }));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));

        await waitFor(() => expect(result.current.project?.version).toBe(3));
        expect(fetchProjectBySlugMock).toHaveBeenCalledWith('demo');
        expect(result.current.err).toBeNull();
        expect(result.current.liveCode).toBeUndefined();
        expect(result.current.lastLiveUpdate).toBeNull();
        expect(result.current.privacyBusy).toBe(false);
        expect(result.current.upgradeNeeded).toBe(false);
        expect(lastEventSource().url).toContain('/api/v1/projects/demo/events');
    });

    it('surfaces initial fetch failures as String(error)', async () => {
        fetchProjectBySlugMock.mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));

        await waitFor(() => expect(result.current.err).toBe('Error: boom'));
        expect(result.current.project).toBeNull();
    });

    it('applies a newer SSE update frame through a guarded refetch', async () => {
        fetchProjectBySlugMock
            .mockResolvedValueOnce(project({ version: 1 }))
            .mockResolvedValueOnce(project({ version: 2, current_code: 'sphere();' }));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project?.version).toBe(1));

        await act(async () => {
            lastEventSource().emit(
                'update',
                new MessageEvent('update', { data: JSON.stringify({ version: 2 }) }),
            );
            await Promise.resolve();
        });

        await waitFor(() => expect(result.current.liveCode).toBe('sphere();'));
        expect(fetchProjectBySlugMock).toHaveBeenCalledTimes(2);
        expect(result.current.lastLiveUpdate).toBeInstanceOf(Date);
    });

    it('drops an SSE frame whose version is not newer than the seeded guard', async () => {
        fetchProjectBySlugMock.mockResolvedValue(project({ version: 2 }));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project?.version).toBe(2));

        await act(async () => {
            lastEventSource().emit(
                'update',
                new MessageEvent('update', { data: JSON.stringify({ version: 2 }) }),
            );
            await Promise.resolve();
        });

        expect(fetchProjectBySlugMock).toHaveBeenCalledTimes(1);
        expect(result.current.liveCode).toBeUndefined();
    });

    it('refetches unguarded after an SSE reconnect (open following error)', async () => {
        fetchProjectBySlugMock
            .mockResolvedValueOnce(project({ version: 1 }))
            .mockResolvedValueOnce(project({ version: 5, current_code: 'reconnected();' }));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project?.version).toBe(1));

        await act(async () => {
            lastEventSource().emit('error', new Event('error'));
            lastEventSource().emit('open', new Event('open'));
            await Promise.resolve();
        });

        await waitFor(() => expect(result.current.liveCode).toBe('reconnected();'));
        expect(fetchProjectBySlugMock).toHaveBeenCalledTimes(2);
    });

    it('treats a malformed SSE frame as an unguarded refetch', async () => {
        fetchProjectBySlugMock
            .mockResolvedValueOnce(project({ version: 1 }))
            .mockResolvedValueOnce(project({ version: 2, current_code: 'from-refetch();' }));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project?.version).toBe(1));

        await act(async () => {
            lastEventSource().emit(
                'update',
                new MessageEvent('update', { data: '{not-json' }),
            );
            await Promise.resolve();
        });

        await waitFor(() => expect(result.current.liveCode).toBe('from-refetch();'));
    });

    it('handleRestored pushes code through the live path and bumps the version guard', async () => {
        fetchProjectBySlugMock
            .mockResolvedValueOnce(project({ version: 1 }))
            .mockResolvedValueOnce(project({ version: 3, current_code: 'newer();' }));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project?.version).toBe(1));

        act(() => {
            result.current.handleRestored('restored();');
        });
        expect(result.current.liveCode).toBe('restored();');
        expect(result.current.lastLiveUpdate).toBeInstanceOf(Date);

        await act(async () => {
            lastEventSource().emit(
                'update',
                new MessageEvent('update', { data: JSON.stringify({ version: 2 }) }),
            );
            await Promise.resolve();
        });
        expect(fetchProjectBySlugMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            lastEventSource().emit(
                'update',
                new MessageEvent('update', { data: JSON.stringify({ version: 3 }) }),
            );
            await Promise.resolve();
        });
        await waitFor(() => expect(result.current.liveCode).toBe('newer();'));
        expect(fetchProjectBySlugMock).toHaveBeenCalledTimes(2);
    });

    it('toggles a public_unlisted project to private via the API response', async () => {
        fetchProjectBySlugMock.mockResolvedValue(project({ privacy: 'public_unlisted' }));
        setProjectPrivacyMock.mockResolvedValue({ privacy: 'private' });
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project).not.toBeNull());

        await act(async () => {
            await result.current.handleTogglePrivacy();
        });

        expect(setProjectPrivacyMock).toHaveBeenCalledWith('demo', 'private');
        expect(result.current.project?.privacy).toBe('private');
        expect(result.current.privacyBusy).toBe(false);
        expect(result.current.upgradeNeeded).toBe(false);
    });

    it('toggles a private project back to public_unlisted', async () => {
        fetchProjectBySlugMock.mockResolvedValue(project({ privacy: 'private' }));
        setProjectPrivacyMock.mockResolvedValue({ privacy: 'public_unlisted' });
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project).not.toBeNull());

        await act(async () => {
            await result.current.handleTogglePrivacy();
        });

        expect(setProjectPrivacyMock).toHaveBeenCalledWith('demo', 'public_unlisted');
        expect(result.current.project?.privacy).toBe('public_unlisted');
    });

    it('maps PRIVATE_REQUIRES_PAID rejections to the upgrade CTA state', async () => {
        fetchProjectBySlugMock.mockResolvedValue(project({ privacy: 'public_unlisted' }));
        setProjectPrivacyMock.mockRejectedValue(
            new Error(`403: ${PRIVATE_REQUIRES_PAID}`),
        );
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project).not.toBeNull());

        await act(async () => {
            await result.current.handleTogglePrivacy();
        });

        expect(result.current.upgradeNeeded).toBe(true);
        expect(result.current.privacyBusy).toBe(false);
        expect(result.current.project?.privacy).toBe('public_unlisted');
    });

    it('leaves upgradeNeeded false for transient privacy failures', async () => {
        fetchProjectBySlugMock.mockResolvedValue(project({ privacy: 'public_unlisted' }));
        setProjectPrivacyMock.mockRejectedValue(new Error('network down'));
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project).not.toBeNull());

        await act(async () => {
            await result.current.handleTogglePrivacy();
        });

        expect(result.current.upgradeNeeded).toBe(false);
        expect(result.current.privacyBusy).toBe(false);
    });

    it('captures and posts the first settled viewer frame after the project loads', async () => {
        const png = 'p'.repeat(3000);
        fetchProjectBySlugMock.mockResolvedValue(project({ version: 1 }));
        captureViewerPngBase64Mock.mockReturnValue(png);
        postProjectRenderMock.mockResolvedValue({ url: 'https://cdn/render.png' });
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));

        await waitFor(() => expect(result.current.project).not.toBeNull());
        expect(postProjectRenderMock).not.toHaveBeenCalled();

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 1800));
        });

        expect(captureViewerPngBase64Mock).toHaveBeenCalled();
        expect(postProjectRenderMock).toHaveBeenCalledWith('demo', png);
    });

    it('keeps sampling past two grabs until the frame settles', async () => {
        const sizes = [3000, 5000, 8000, 8050];
        let call = 0;
        fetchProjectBySlugMock.mockResolvedValue(project({ version: 1 }));
        captureViewerPngBase64Mock.mockImplementation(() => 'p'.repeat(sizes[Math.min(call++, sizes.length - 1)]!));
        postProjectRenderMock.mockResolvedValue({ url: 'https://cdn/render.png' });
        const { result } = renderHook(() => useProjectLiveUpdates('demo'));
        await waitFor(() => expect(result.current.project).not.toBeNull());

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 3200));
        });

        expect(captureViewerPngBase64Mock).toHaveBeenCalledTimes(4);
        expect(postProjectRenderMock).toHaveBeenCalledWith('demo', 'p'.repeat(8050));
    });

    it('does not upload a historical ?version= pin as the latest render', async () => {
        window.history.replaceState(null, '', '/p/demo?version=1');
        try {
            fetchProjectBySlugMock.mockResolvedValue(project({ version: 3 }));
            captureViewerPngBase64Mock.mockReturnValue('p'.repeat(3000));
            const { result } = renderHook(() => useProjectLiveUpdates('demo'));
            await waitFor(() => expect(result.current.project).not.toBeNull());
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 1800));
            });
            expect(captureViewerPngBase64Mock).not.toHaveBeenCalled();
            expect(postProjectRenderMock).not.toHaveBeenCalled();
        } finally {
            window.history.replaceState(null, '', '/');
        }
    });

    it('drops the previous project\'s live code when the slug changes', async () => {
        fetchProjectBySlugMock.mockResolvedValue(project({ version: 1 }));
        const { result, rerender } = renderHook(({ slug }) => useProjectLiveUpdates(slug), { initialProps: { slug: 'demo' } });
        await waitFor(() => expect(result.current.project).not.toBeNull());
        act(() => result.current.handleRestored('restored();'));
        expect(result.current.liveCode).toBe('restored();');
        rerender({ slug: 'other' });
        expect(result.current.liveCode).toBeUndefined();
    });

    describe('initial load state', () => {
        it('reports a missing or private slug as not_found instead of loading forever', async () => {
            fetchProjectBySlugMock.mockResolvedValue(null);
            const { result } = renderHook(() => useProjectLiveUpdates('nope'));

            expect(result.current.loadState).toBe('loading');
            await waitFor(() => expect(result.current.loadState).toBe('not_found'));
            expect(result.current.project).toBeNull();
            expect(result.current.err).toBeNull();
        });

        it('marks a request with no answer as slow, then as timed out', async () => {
            vi.useFakeTimers();
            try {
                fetchProjectBySlugMock.mockReturnValue(new Promise(() => {}));
                const { result } = renderHook(() => useProjectLiveUpdates('demo'));

                expect(result.current.loadState).toBe('loading');
                act(() => vi.advanceTimersByTime(LOAD_SLOW_MS));
                expect(result.current.loadState).toBe('slow');
                act(() => vi.advanceTimersByTime(LOAD_TIMEOUT_MS - LOAD_SLOW_MS));
                expect(result.current.loadState).toBe('timeout');
            } finally {
                vi.useRealTimers();
            }
        });

        it('still shows a project whose answer arrives after the timeout', async () => {
            vi.useFakeTimers();
            try {
                let resolve: (row: ProjectRow | null) => void = () => {};
                fetchProjectBySlugMock.mockReturnValue(new Promise((r) => { resolve = r; }));
                const { result } = renderHook(() => useProjectLiveUpdates('demo'));
                act(() => vi.advanceTimersByTime(LOAD_TIMEOUT_MS));
                expect(result.current.loadState).toBe('timeout');

                await act(async () => { resolve(project({ title: 'Late' })); });

                expect(result.current.loadState).toBe('ready');
                expect(result.current.project?.title).toBe('Late');
            } finally {
                vi.useRealTimers();
            }
        });

        it('reports a failed request as error and loads again on retry', async () => {
            fetchProjectBySlugMock
                .mockRejectedValueOnce(new Error('network down'))
                .mockResolvedValueOnce(project({ title: 'Second try' }));
            const { result } = renderHook(() => useProjectLiveUpdates('demo'));
            await waitFor(() => expect(result.current.loadState).toBe('error'));
            expect(result.current.err).toBe('Error: network down');

            act(() => result.current.retry());

            expect(result.current.loadState).toBe('loading');
            await waitFor(() => expect(result.current.loadState).toBe('ready'));
            expect(result.current.project?.title).toBe('Second try');
            expect(result.current.err).toBeNull();
            expect(fetchProjectBySlugMock).toHaveBeenCalledTimes(2);
        });
    });
});
