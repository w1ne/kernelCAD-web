// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CORNER_INSET_VAR, CORNER_TOP } from './components/viewer/cornerControls';
import { MeasureButton } from './components/viewer/measure/MeasureButton';
import { DimensionsButton } from './components/viewer/dimensions/DimensionsButton';

vi.mock('./OrderButton', () => ({
    OrderButton: ({ compact }: { compact?: boolean }) => <button type="button" data-testid="toolbar-order" data-compact={String(!!compact)}>Order</button>,
}));

import { ViewportToolbar } from './ViewportToolbar';

const display = {
    viewMode3D: 'shadedWithEdges' as const, setViewMode3D: () => undefined,
    background: 'dark' as never, setBackground: () => undefined,
    gridVisible: true, setGridVisible: () => undefined,
};

function rect(left: number, top: number, width: number, height: number): DOMRect {
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

function mountAt(barLeft: number, narrow = false) {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: narrow && q.includes('max-width'), addEventListener() {}, removeEventListener() {} }));
    const host = document.createElement('div');
    document.body.appendChild(host);
    host.getBoundingClientRect = () => rect(0, 44, 390, 743);
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        return this.getAttribute('role') === 'toolbar' ? rect(barLeft, 56, 366, 54) : rect(0, 0, 0, 0);
    });
    render(
        <ViewportToolbar onRun={() => undefined} onValidate={() => undefined} markingMode={false} onToggleMarkingMode={() => undefined}
            sectionMode={false} onToggleSectionMode={() => undefined} display={display} />,
        { container: host },
    );
    spy.mockRestore();
    return host;
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
});

describe('floating toolbar vs the viewer corner controls (phone)', () => {
    it('pushes Measure/Dimensions below the toolbar when it reaches the top-left corner', () => {
        // 390 px phone: the toolbar spans x 12..378, over Measure at left-3.
        const host = mountAt(12, true);
        expect(host.style.getPropertyValue(CORNER_INSET_VAR)).toBe('66px');
    });

    it('leaves them in the corner when the toolbar is centred clear of it (desktop)', () => {
        const host = mountAt(350);
        expect(host.style.getPropertyValue(CORNER_INSET_VAR)).toBe('0px');
    });

    it('wraps instead of spilling past a narrow viewport, and compacts Order on phones', () => {
        mountAt(12, true);
        const bar = screen.getByRole('toolbar');
        expect(bar.className).toContain('flex-wrap');
        expect(bar.className).toContain('max-w-[calc(100%-1.5rem)]');
        expect(screen.getByTestId('toolbar-order').getAttribute('data-compact')).toBe('true');
    });

    it('Measure and Dimensions read their top from the inset variable', () => {
        expect(CORNER_TOP.top).toContain(`var(${CORNER_INSET_VAR}`);
        render(<><MeasureButton active={false} onToggle={() => undefined} /><DimensionsButton on={false} onToggle={() => undefined} legacy={false} /></>);
        for (const id of ['measure-toggle', 'dimensions-toggle']) {
            const el = screen.getByTestId(id);
            // happy-dom drops calc(var()) from inline styles; check what React was handed.
            const props = Object.entries(el).find(([k]) => k.startsWith('__reactProps'))?.[1] as { style?: unknown };
            expect(props.style).toBe(CORNER_TOP);
            expect(el.className).not.toMatch(/\btop-3\b/);
        }
    });
});
