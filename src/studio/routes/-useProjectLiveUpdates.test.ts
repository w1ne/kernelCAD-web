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
import { useProjectLiveUpdates } from './-useProjectLiveUpdates';

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
});
