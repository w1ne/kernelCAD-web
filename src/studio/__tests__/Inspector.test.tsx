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
    it('renders the active tab slot from tabSlots (defaults to scene)', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(
            <Inspector
                tabSlots={{
                    scene: <div data-testid="scene-slot">SCENE BODY</div>,
                    code: <div data-testid="code-slot">CODE BODY</div>,
                }}
            />,
        );

        expect(screen.getByTestId('scene-slot').textContent).toBe('SCENE BODY');
        expect(screen.queryByTestId('code-slot')).toBeNull();
        expect(screen.getByTestId('inspector').className).toContain('shrink-0');
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

        fireEvent.click(screen.getByTestId('inspector-tab-code'));

        expect(screen.getByTestId('code-slot').textContent).toBe('CODE BODY');
        expect(screen.queryByTestId('scene-slot')).toBeNull();
    });

    it('falls back to scene when the previously active tab disappears from visible tabs', () => {
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

        expect(screen.getByTestId('scene-slot').textContent).toBe('SCENE BODY');
        expect(screen.queryByTestId('params-slot')).toBeNull();
    });

    it('collapses to zero width when inspectorOpen is false', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(<Inspector tabSlots={{ scene: <div>SCENE BODY</div> }} />);

        const panel = screen.getByTestId('inspector');
        expect(panel.style.width).toBe('290px');
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

        expect(panel.style.width).toBe('290px');
        expect(panel.getAttribute('aria-hidden')).toBe('false');
    });
});
