// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRecomputeResult } from '../types';
import { ParamTable } from '../../shared/runtime/paramTable';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));

import { Inspector } from '../Inspector';
import { shellStore } from '../store/shellStore';

function emptyResult(): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
    };
}

function withOneParam(): StudioRecomputeResult {
    const table = new ParamTable();
    table.declare('wall', 'number', 1);
    return { ...emptyResult(), paramTable: table };
}

afterEach(() => {
    cleanup();
    shellStore.reset();
});

beforeEach(() => {
    mockUseRecomputeResult.mockReset();
});

describe('Inspector', () => {
    it('renders the active tab slot from tabSlots (defaults to code)', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(
            <Inspector
                tabSlots={{
                    scene: <div data-testid="scene-slot">SCENE BODY</div>,
                    code: <div data-testid="code-slot">CODE BODY</div>,
                }}
            />,
        );

        expect(screen.getByTestId('code-slot').textContent).toBe('CODE BODY');
        expect(screen.queryByTestId('scene-slot')).toBeNull();
        expect(screen.getByTestId('inspector').className).toContain('shrink-0');
        // The workbench inspector uses the dark semantic tokens.
        expect(screen.getByTestId('inspector').getAttribute('data-theme')).toBe('dark');
    });

    it('switches active tab when a visible tab button is clicked', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(
            <Inspector
                tabSlots={{
                    scene: <div data-testid="scene-slot">SCENE BODY</div>,
                    code: <div data-testid="code-slot">CODE BODY</div>,
                }}
            />,
        );

        fireEvent.click(screen.getByTestId('inspector-tab-scene'));

        expect(screen.getByTestId('scene-slot').textContent).toBe('SCENE BODY');
        expect(screen.queryByTestId('code-slot')).toBeNull();
    });

    it('falls back to code when the previously active tab disappears from visible tabs', () => {
        mockUseRecomputeResult.mockReturnValue(withOneParam());

        const { rerender } = render(
            <Inspector
                tabSlots={{
                    scene: <div data-testid="scene-slot">SCENE BODY</div>,
                    code: <div data-testid="code-slot">CODE BODY</div>,
                    params: <div data-testid="params-slot">PARAMS BODY</div>,
                }}
            />,
        );

        fireEvent.click(screen.getByTestId('inspector-tab-params'));
        expect(screen.getByTestId('params-slot').textContent).toBe('PARAMS BODY');

        mockUseRecomputeResult.mockReturnValue(emptyResult());
        rerender(
            <Inspector
                tabSlots={{
                    scene: <div data-testid="scene-slot">SCENE BODY</div>,
                    code: <div data-testid="code-slot">CODE BODY</div>,
                    params: <div data-testid="params-slot">PARAMS BODY</div>,
                }}
            />,
        );

        expect(screen.getByTestId('code-slot').textContent).toBe('CODE BODY');
        expect(screen.queryByTestId('params-slot')).toBeNull();
    });

    it('collapses to zero width when inspectorOpen is false', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(<Inspector tabSlots={{ scene: <div>SCENE BODY</div> }} />);

        const panel = screen.getByTestId('inspector');
        expect(panel.style.width).toBe('340px');
        expect(panel.getAttribute('data-open')).toBe('true');

        act(() => {
            shellStore.setInspectorOpen(false);
        });

        expect(panel.style.width).toBe('0px');
        expect(panel.getAttribute('data-open')).toBe('false');
        expect(panel.getAttribute('aria-hidden')).toBe('true');

        act(() => {
            shellStore.setInspectorOpen(true);
        });

        expect(panel.style.width).toBe('340px');
        expect(panel.getAttribute('aria-hidden')).toBe('false');
    });

    it('hides reserved tabs and never renders a disabled tab', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(<Inspector tabSlots={{ code: <div>CODE BODY</div> }} />);

        for (const id of ['sections', 'cut', 'render', 'joints', 'animation', 'export', 'params']) {
            expect(screen.queryByTestId(`inspector-tab-${id}`)).toBeNull();
        }
        expect(screen.getByTestId('inspector-tab-validity').textContent).toContain('Checks');
        expect(document.querySelector('[role="tab"][disabled], [role="tab"][aria-disabled="true"]')).toBeNull();
    });

    it('shows the count of errors and warnings on the Checks tab', () => {
        mockUseRecomputeResult.mockReturnValue({
            ...emptyResult(),
            validity: {
                status: 'error',
                validated: true,
                partCount: 2,
                jointCount: 1,
                diagnostics: [
                    { code: 'assembly.part.floating', severity: 'error', message: 'a floats', hint: 'mate a', partName: 'a' },
                    { code: 'assembly.mate.over-constrained', severity: 'warning', message: 'm', hint: '', mateName: 'm' },
                    { code: 'assembly.mate.over-constrained', severity: 'info', message: 'n', hint: '', mateName: 'n' },
                ],
            },
        });

        render(<Inspector tabSlots={{ code: <div>CODE BODY</div> }} />);

        expect(screen.getByTestId('inspector-tab-validity').textContent).toBe('Checks2');
    });

    it('resizes from the keyboard within 280–560 px and persists the width', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());
        window.localStorage.removeItem('kernelcad:inspectorWidth');

        render(<Inspector tabSlots={{ code: <div>CODE BODY</div> }} />);

        const panel = screen.getByTestId('inspector');
        const handle = screen.getByRole('separator', { name: 'Resize inspector' });
        expect(handle.getAttribute('aria-valuenow')).toBe('340');

        fireEvent.keyDown(handle, { key: 'ArrowLeft' });
        expect(panel.style.width).toBe('356px');
        expect(window.localStorage.getItem('kernelcad:inspectorWidth')).toBe('356');

        fireEvent.keyDown(handle, { key: 'End' });
        expect(panel.style.width).toBe('560px');
        fireEvent.keyDown(handle, { key: 'ArrowLeft' });
        expect(panel.style.width).toBe('560px');

        fireEvent.keyDown(handle, { key: 'Home' });
        expect(panel.style.width).toBe('280px');

        fireEvent.doubleClick(handle);
        expect(panel.style.width).toBe('340px');
        window.localStorage.removeItem('kernelcad:inspectorWidth');
    });

    it('resizes by dragging the left edge', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());
        window.localStorage.removeItem('kernelcad:inspectorWidth');

        render(<Inspector tabSlots={{ code: <div>CODE BODY</div> }} />);

        const panel = screen.getByTestId('inspector');
        const handle = screen.getByTestId('inspector-resize-handle');
        fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
        fireEvent.pointerMove(handle, { clientX: 900, pointerId: 1 });
        expect(panel.style.width).toBe('440px');
        fireEvent.pointerUp(handle, { clientX: 900, pointerId: 1 });
        expect(window.localStorage.getItem('kernelcad:inspectorWidth')).toBe('440');
        window.localStorage.removeItem('kernelcad:inspectorWidth');
    });
});
