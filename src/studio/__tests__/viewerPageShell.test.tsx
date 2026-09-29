// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// The model-first page layout: one panel (side panel / bottom sheet), the
// sheet handle, and the model stage's poster → live model hand-over.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../components/Viewer', () => ({ default: () => null }));
vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => ({}) }));

import { ModelStage, ViewerPageShell } from '../ViewerPageShell';

/** Fake timers that also drive animation frames. */
function useFakeFrames(): void {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
