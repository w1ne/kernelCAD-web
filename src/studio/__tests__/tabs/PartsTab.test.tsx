// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PartsTab } from '../../tabs/PartsTab';
import type { BomRow } from '../../../agent/script-runtime/bom';

const rows: BomRow[] = [
    {
        item: 1,
        name: 'plate',
        quantity: 2,
        kind: 'fabricated',
        material: 'aluminum',
        density: 2700,
        massGPerUnit: 100,
        massGTotal: 200,
        bboxMm: { min: [0, 0, 0], max: [1, 1, 1] },
        process: 'sheet-cut',
        processSource: 'declared',
        instancePaths: ['plate_a', 'plate_b'],
    },
    {
        item: 2,
        name: 'screw_0',
        quantity: 4,
        kind: 'purchased',
        material: null,
        density: null,
        massGPerUnit: null,
        massGTotal: null,
        bboxMm: { min: [0, 0, 0], max: [1, 1, 1] },
        process: null,
        processSource: null,
        catalog: {
            id: 'iso-4762-m2x4',
            vendor: 'kernelCAD catalog',
            partNumber: 'ISO 4762',
            source: null,
            license: 'MIT',
        },
        instancePaths: ['screw_0', 'screw_1', 'screw_2', 'screw_3'],
    },
];

const bomCalls: unknown[][] = [];

vi.mock('../../hooks/useBom', () => ({
    useBom: (...args: unknown[]) => {
        bomCalls.push(args);
        return {
            status: 'ready',
            rows,
            totals: { partCount: 6, uniquePartCount: 2, totalMassG: 200 },
            diagnostics: [],
        };
    },
}));

const features = [
    { id: 'assemblyPart_1', kind: 'assemblyPart', metadata: { partName: 'plate_a' } },
    { id: 'assemblyPart_2', kind: 'assemblyPart', metadata: { partName: 'plate_b' } },
];

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({ features }),
}));

vi.mock('../../context/CodeContext', () => ({ useCode: () => ({ code: 'return 1;' }) }));

const highlightFromCode = vi.fn();
vi.mock('../../selectionCode/selectionCodeStore', () => ({
    selectionCodeStore: { highlightFromCode: (ids: string[]) => highlightFromCode(ids) },
}));

beforeEach(() => {
    highlightFromCode.mockClear();
    bomCalls.length = 0;
    window.history.replaceState(null, '', '/?script=examples/foo.kcad.ts');
});

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('PartsTab', () => {
    it('renders rows, quantities, process chips, and totals', () => {
        render(<PartsTab />);
        expect(screen.getByText('plate')).toBeTruthy();
        expect(screen.getByTestId('parts-row-qty-1').textContent).toBe('2');
        expect(screen.getByTestId('parts-row-process-1').textContent).toContain('sheet-cut');
        expect(screen.getByText(/6 parts · 2 unique/)).toBeTruthy();
    });

    it('highlights every instance of a row on click', () => {
        render(<PartsTab />);
        fireEvent.click(screen.getByTestId('parts-row-1'));
        expect(highlightFromCode).toHaveBeenCalledWith(['assemblyPart_1', 'assemblyPart_2']);
    });

    it('addresses the BOM by the current script context (viewport parity)', () => {
        render(<PartsTab />);
        expect(bomCalls.at(-1)).toEqual(['return 1;', true, 'examples/foo.kcad.ts']);
    });
});
