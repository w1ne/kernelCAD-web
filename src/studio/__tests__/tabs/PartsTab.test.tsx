// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PartsTab } from '../../tabs/PartsTab';
import type { BomRow, BomTotals } from '../../../agent/script-runtime/bom';

const baseRows: BomRow[] = [
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

interface MockBomState {
    status: 'ready' | 'error';
    rows: BomRow[];
    totals: BomTotals | null;
    diagnostics: unknown[];
    error?: string;
}

let bomState: MockBomState;
const bomCalls: unknown[][] = [];

vi.mock('../../hooks/useBom', () => ({
    useBom: (...args: unknown[]) => {
        bomCalls.push(args);
        return bomState;
    },
}));

const baseFeatures = [
    { id: 'assemblyPart_1', kind: 'assemblyPart', metadata: { partName: 'plate_a' } },
    { id: 'assemblyPart_2', kind: 'assemblyPart', metadata: { partName: 'plate_b' } },
];

let features = baseFeatures;

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({ features }),
}));

vi.mock('../../context/CodeContext', () => ({ useCode: () => ({ code: 'return 1;' }) }));

let workbenchSessionToken: string | null = null;
vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ sessionToken: workbenchSessionToken }),
}));

const highlightFromCode = vi.fn();
vi.mock('../../selectionCode/selectionCodeStore', () => ({
    selectionCodeStore: { highlightFromCode: (ids: string[]) => highlightFromCode(ids) },
}));

const exportViaServer = vi.fn(async () => ({ blob: new Blob(['pack']), downloadName: 'part.zip' }));
const downloadBlob = vi.fn();
// Keep the real error helpers (useExportTask reads them) and mock only the
// transport + download side effects.
vi.mock('../../exportViaServer', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../exportViaServer')>();
    return {
        ...actual,
        exportViaServer: (...args: unknown[]) => exportViaServer(...args),
        downloadBlob: (...args: unknown[]) => downloadBlob(...args),
    };
});

beforeEach(() => {
    highlightFromCode.mockClear();
    exportViaServer.mockClear();
    downloadBlob.mockClear();
    bomCalls.length = 0;
    bomState = {
        status: 'ready',
        rows: baseRows,
        totals: { partCount: 6, uniquePartCount: 2, totalMassG: 200 },
        diagnostics: [],
    };
    features = baseFeatures;
    workbenchSessionToken = null;
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

    it('highlights every feature when a part name is duplicated across assemblies', () => {
        features = [...baseFeatures, { id: 'assemblyPart_3', kind: 'assemblyPart', metadata: { partName: 'plate_a' } }];
        render(<PartsTab />);
        fireEvent.click(screen.getByTestId('parts-row-1'));
        expect(highlightFromCode).toHaveBeenCalledWith(['assemblyPart_1', 'assemblyPart_3', 'assemblyPart_2']);
    });

    it('addresses the BOM by the current script context (viewport parity)', () => {
        render(<PartsTab />);
        expect(bomCalls.at(-1)).toEqual(['return 1;', true, 'examples/foo.kcad.ts', null]);
    });

    it('forwards the live pool session token so slider overrides reach the BOM', () => {
        workbenchSessionToken = 'sess-42';
        render(<PartsTab />);
        expect(bomCalls.at(-1)).toEqual(['return 1;', true, 'examples/foo.kcad.ts', 'sess-42']);
    });

    it('opens the Order sheet from the Order… button', () => {
        render(<PartsTab />);
        const opener = screen.getByTestId('parts-order-open');
        expect(opener.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(opener);
        expect(screen.getByRole('dialog', { name: 'Order parts' })).toBeTruthy();
    });

    it('downloads the order pack of a fabricated row only', async () => {
        render(<PartsTab />);
        expect(screen.queryByTestId('parts-row-download-2')).toBeNull();
        fireEvent.click(screen.getByTestId('parts-row-download-1'));
        await waitFor(() => expect(exportViaServer).toHaveBeenCalledWith(
            'order-pack',
            'return 1;',
            expect.objectContaining({ exportOptions: { items: [1] } }),
        ));
        expect(downloadBlob).toHaveBeenCalledOnce();
    });

    it('shows a failed per-row download in the status region by the totals', async () => {
        exportViaServer.mockRejectedValueOnce(new Error('order pack failed on the server'));
        render(<PartsTab />);
        fireEvent.click(screen.getByTestId('parts-row-download-1'));
        await waitFor(() => expect(screen.getByTestId('parts-status-error')).toBeTruthy());
        expect(screen.getByTestId('parts-status-error').textContent).toContain('order pack failed on the server');
    });

    it('falls back to the computed sum when totals are missing', () => {
        bomState = { ...bomState, totals: null };
        render(<PartsTab />);
        expect(screen.getByTestId('parts-totals').textContent).toContain('200 g');
    });

    it('shows mass unknown when totals are missing and no row has a mass', () => {
        bomState = {
            ...bomState,
            totals: null,
            rows: baseRows.map((row) => ({ ...row, massGPerUnit: null, massGTotal: null })),
        };
        render(<PartsTab />);
        expect(screen.getByTestId('parts-totals').textContent).toContain('mass unknown');
    });

    it('renders BOM failures with the error styling', () => {
        bomState = { status: 'error', rows: [], totals: null, diagnostics: [], error: 'BOM failed.' };
        render(<PartsTab />);
        expect(screen.getByTestId('parts-error').textContent).toContain('BOM failed.');
        expect(screen.getByTestId('parts-error').className).toContain('text-red-200');
    });
});
