// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// The model-first page layout: one panel (side panel / bottom sheet), the
// sheet handle, and the model stage's poster → live model hand-over.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';

const shellMocks = vi.hoisted(() => {
    const listeners = new Set<() => void>();
    const state = {
        workbench: {} as Record<string, unknown>,
        notice: { meshing: false, approximate: false },
    };
    return {
        state,
        listeners,
        setMeshing(meshing: boolean) {
            state.notice = { ...state.notice, meshing };
            listeners.forEach((listener) => listener());
        },
    };
});

vi.mock('../components/Viewer', () => ({ default: () => null }));
vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => shellMocks.state.workbench }));
vi.mock('../scriptSource', () => ({
    getMeshNotice: () => shellMocks.state.notice,
    subscribeMeshNotice: (listener: () => void) => {
        shellMocks.listeners.add(listener);
        return () => shellMocks.listeners.delete(listener);
    },
}));

import { liveViewportPhase, ModelStage, STAGE_GAVE_UP, useLiveViewportState, ViewerPageShell } from '../ViewerPageShell';

/** Fake timers that also drive animation frames. */
function useFakeFrames(): void {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
}

afterEach(() => {
    shellMocks.state.workbench = {};
    shellMocks.setMeshing(false);
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('liveViewportPhase', () => {
    const base = {
        displayReady: false,
        nonempty: false,
        isComputing: true,
        error: null,
        emptySettled: false,
        stuck: false,
    };

    it('clears the overlay once geometry exists, before the frame sensor', () => {
        expect(liveViewportPhase({ ...base, nonempty: true, isComputing: false }).phase).toBe('displayed');
    });

    it('turns a spin with no model into an error', () => {
        expect(liveViewportPhase({ ...base, isComputing: false, stuck: true })).toEqual({
            phase: 'failed',
            error: STAGE_GAVE_UP,
            busy: false,
        });
    });

    it('keeps a model that already painted when a later rebuild fails', () => {
        expect(liveViewportPhase({
            ...base,
            nonempty: true,
            displayReady: true,
            error: 'rebuild failed',
            isComputing: false,
        }).phase).toBe('displayed');
    });
});

describe('useLiveViewportState watchdog', () => {
    it('does not give up while the server reports "Still meshing…"', () => {
        vi.useFakeTimers();
        shellMocks.state.workbench = { geometries: [], isReady: false, isComputing: true, error: null };
        shellMocks.setMeshing(true);
        const { result } = renderHook(() => useLiveViewportState(false));
        act(() => { vi.advanceTimersByTime(90_000); });
        expect(result.current.phase).toBe('building');
    });

    it('waits past the server budget while a build request is in flight', () => {
        vi.useFakeTimers();
        shellMocks.state.workbench = { geometries: [], isReady: false, isComputing: true, error: null };
        const { result } = renderHook(() => useLiveViewportState(false));
        act(() => { vi.advanceTimersByTime(30_000); });
        expect(result.current.phase).toBe('building');
        act(() => { vi.advanceTimersByTime(20_000); });
        expect(result.current.phase).toBe('failed');
    });

    it('gives up after 12 s when nothing is building and nothing is on screen', () => {
        vi.useFakeTimers();
        shellMocks.state.workbench = { geometries: [], isReady: false, isComputing: false, error: null };
        const { result } = renderHook(() => useLiveViewportState(false));
        act(() => { vi.advanceTimersByTime(12_500); });
        expect(result.current).toEqual({ phase: 'failed', error: STAGE_GAVE_UP, busy: false });
    });
});

describe('ViewerPageShell', () => {
    it('renders the title, the panel once, and the phone action bar', () => {
        render(
            <ViewerPageShell
                title="Pipe clamp bracket"
                stage={<div data-testid="stage" />}
                panel={<div data-testid="panel-content" />}
                panelLabel="Model details"
                actionBar={<button type="button">Download STL</button>}
            />,
        );
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pipe clamp bracket');
        expect(screen.getAllByTestId('panel-content')).toHaveLength(1);
        expect(screen.getByRole('complementary', { name: 'Model details' })).toBeTruthy();
        expect(screen.getByTestId('project-action-bar').textContent).toContain('Download STL');
        expect(screen.getByTestId('viewer-page').getAttribute('data-theme')).toBe('light');
    });

    it('moves the phone sheet between its snap points with the keys and a tap', () => {
        render(<ViewerPageShell title="T" stage={null} panel={null} panelLabel="Model details" />);
        const handle = screen.getByRole('slider', { name: 'Panel height' });
        const height = () => screen.getByTestId('project-panel').style.getPropertyValue('--kc-sheet-h');
        expect(handle.getAttribute('aria-valuenow')).toBe('30');
        expect(height()).toBe('30dvh');

        fireEvent.keyDown(handle, { key: 'ArrowUp' });
        expect(handle.getAttribute('aria-valuenow')).toBe('55');
        fireEvent.keyDown(handle, { key: 'End' });
        expect(height()).toBe('90dvh');
        fireEvent.keyDown(handle, { key: 'Home' });
        expect(handle.getAttribute('aria-valuenow')).toBe('30');

        fireEvent.click(handle);
        expect(handle.getAttribute('aria-valuenow')).toBe('55');
    });
});

describe('ModelStage', () => {
    it('shows the poster and holds the live canvas until the poster painted', async () => {
        useFakeFrames();
        render(
            <ModelStage posterSrc="/poster.png" posterAlt="Render of X" phase="building">
                <div data-testid="live-canvas" />
            </ModelStage>,
        );
        const poster = screen.getByTestId('model-poster');
        expect(poster.getAttribute('src')).toBe('/poster.png');
        expect(screen.queryByTestId('live-canvas')).toBeNull();
        expect(screen.getByTestId('model-stage-status').textContent).toBe('Building the model…');

        act(() => {
            fireEvent.load(poster);
        });
        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        expect(poster.className).toContain('opacity-100');
        expect(screen.getByTestId('live-canvas')).toBeTruthy();
    });

    it('mounts the live canvas anyway when the poster never arrives', async () => {
        useFakeFrames();
        render(
            <ModelStage posterSrc="/poster.png" posterAlt="Render" phase="building">
                <div data-testid="live-canvas" />
            </ModelStage>,
        );
        await act(async () => {
            vi.advanceTimersByTime(1_300);
        });
        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        expect(screen.getByTestId('live-canvas')).toBeTruthy();
    });

    it('says a slow build is slow', async () => {
        vi.useFakeTimers();
        render(<ModelStage posterAlt="Render" phase="building" />);
        await act(async () => {
            vi.advanceTimersByTime(8_100);
        });
        expect(screen.getByTestId('model-stage-status').textContent).toMatch(/Still building/);
    });

    it('fades the poster out once the live model is displayed, and shows a failure card', () => {
        const { rerender } = render(
            <ModelStage posterSrc="/p.png" posterAlt="Render" phase="displayed" />,
        );
        fireEvent.load(screen.getByTestId('model-poster'));
        expect(screen.getByTestId('model-poster').className).toContain('opacity-0');
        expect(screen.queryByTestId('model-stage-status')).toBeNull();

        rerender(<ModelStage posterAlt="Render" phase="failed" failure={<div role="alert">The model did not build</div>} />);
        expect(screen.getByRole('alert').textContent).toBe('The model did not build');
    });
});
