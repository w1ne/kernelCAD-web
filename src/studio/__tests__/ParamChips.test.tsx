/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ParamTable } from '../../runtime/paramTable';
import type { StudioRecomputeResult } from '../types';

const mockResult = vi.hoisted(() => ({
    current: null as StudioRecomputeResult | null,
}));

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockResult.current,
}));

import { ParamChips } from '../ParamChips';

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

function tableOf(declarations: Array<[string, number | boolean]>): ParamTable {
    const t = new ParamTable();
    for (const [name, value] of declarations) {
        t.declare(name, typeof value === 'number' ? 'number' : 'boolean', value);
    }
    return t;
}

afterEach(() => {
    cleanup();
    mockResult.current = null;
});

beforeEach(() => {
    mockResult.current = emptyResult();
});

describe('ParamChips', () => {
    it('renders nothing when paramTable is null', () => {
        mockResult.current = { ...emptyResult(), paramTable: null };
        const { container } = render(<ParamChips />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when paramTable is empty', () => {
        mockResult.current = { ...emptyResult(), paramTable: new ParamTable() };
        const { container } = render(<ParamChips />);
        expect(container.firstChild).toBeNull();
    });

    it('renders one chip per param when 2 params are declared', () => {
        mockResult.current = {
            ...emptyResult(),
            paramTable: tableOf([['length', 100], ['height', 25]]),
        };
        render(<ParamChips />);
        expect(screen.getByTestId('param-chip-length')).toBeDefined();
        expect(screen.getByTestId('param-chip-height')).toBeDefined();
        expect(screen.queryByTestId('param-chip-overflow')).toBeNull();
    });

    it('truncates to first 4 chips and adds +N more pill when 6 params are declared', () => {
        mockResult.current = {
            ...emptyResult(),
            paramTable: tableOf([
                ['p1', 1],
                ['p2', 2],
                ['p3', 3],
                ['p4', 4],
                ['p5', 5],
                ['p6', 6],
            ]),
        };
        render(<ParamChips />);
        expect(screen.getByTestId('param-chip-p1')).toBeDefined();
        expect(screen.getByTestId('param-chip-p2')).toBeDefined();
        expect(screen.getByTestId('param-chip-p3')).toBeDefined();
        expect(screen.getByTestId('param-chip-p4')).toBeDefined();
        expect(screen.queryByTestId('param-chip-p5')).toBeNull();
        expect(screen.queryByTestId('param-chip-p6')).toBeNull();
        const overflow = screen.getByTestId('param-chip-overflow');
        expect(overflow.textContent).toContain('+2 more');
    });
});
