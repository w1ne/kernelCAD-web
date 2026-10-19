// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BomRow } from '../../../agent/script-runtime/bom';
import { REFERRAL_DISCLOSURE } from '../../../shared/links/referral';

const bbox: BomRow['bboxMm'] = { min: [0, 0, 0], max: [1, 1, 1] };

const defaultRows: BomRow[] = [
    {
        item: 1,
        name: 'plate',
        quantity: 2,
        kind: 'fabricated',
        material: 'aluminum',
        density: 2700,
        massGPerUnit: 100,
        massGTotal: 200,
        bboxMm: bbox,
        process: 'sheet-cut',
        processSource: 'declared',
        instancePaths: ['plate_a', 'plate_b'],
    },
    {
        item: 2,
        name: 'bracket',
        quantity: 1,
        kind: 'fabricated',
        material: 'pla',
        density: 1240,
        massGPerUnit: 30,
        massGTotal: 30,
        bboxMm: bbox,
        process: '3d-print',
        processSource: 'inferred',
        instancePaths: ['bracket_0'],
    },
    {
        item: 3,
        name: 'socket_screw',
        quantity: 4,
        kind: 'purchased',
        material: null,
        density: null,
        massGPerUnit: null,
        massGTotal: null,
        bboxMm: bbox,
        process: null,
        processSource: null,
        catalog: {
            id: 'mcmaster-91290A115',
            vendor: 'McMaster-Carr',
            partNumber: '91290A115',
            source: null,
            license: 'MIT',
        },
        instancePaths: ['screw_0', 'screw_1', 'screw_2', 'screw_3'],
    },
    {
        item: 4,
        name: 'washer',
        quantity: 2,
        kind: 'purchased',
        material: null,
        density: null,
        massGPerUnit: null,
        massGTotal: null,
        bboxMm: bbox,
        process: null,
        processSource: null,
        catalog: {
            id: 'unknown-washer',
            vendor: null,
            partNumber: null,
            source: 'https://example.com/washers',
            license: 'MIT',
        },
        instancePaths: ['washer_0', 'washer_1'],
    },
    {
        item: 5,
        name: 'lid',
        quantity: 1,
        kind: 'fabricated',
        material: null,
        density: null,
        massGPerUnit: null,
        massGTotal: null,
        bboxMm: bbox,
        process: 'cnc',
        processSource: 'declared',
        instancePaths: ['lid_0'],
    },
];

let rows: BomRow[] = defaultRows;

vi.mock('../../context/CodeContext', () => ({ useCode: () => ({ code: 'return 1;' }) }));
vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ sessionToken: null }),
}));

vi.mock('../../hooks/useBom', () => ({
    useBom: () => ({
        status: 'ready',
        rows,
        totals: { partCount: 10, uniquePartCount: 5, totalMassG: 230 },
        diagnostics: [],
    }),
}));

const exportViaServer = vi.fn(async () => ({ blob: new Blob(['pack']), downloadName: 'order.zip' }));
const downloadBlob = vi.fn();

vi.mock('../../exportViaServer', () => ({
    exportViaServer: (...args: unknown[]) => exportViaServer(...args),
    downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

// The task hook is the PartsTab-test one: run the export synchronously and
// save, so assertions land on the exportViaServer / downloadBlob mocks.
vi.mock('../../hooks/useExportTask', () => ({
    useExportTask: () => ({
        state: { running: null, elapsedSec: 0, progress: null, error: null, notice: null },
        start: async (
            _label: string,
            run: (options: Record<string, never>) => Promise<{ blob: Blob; downloadName: string }>,
            save: (blob: Blob, downloadName: string) => void,
        ) => {
            const file = await run({});
            save(file.blob, file.downloadName);
        },
        cancel: () => undefined,
        dismiss: () => undefined,
    }),
    exportProgressText: () => null,
}));

const writeText = vi.fn(async () => undefined);

beforeEach(() => {
    rows = defaultRows;
    exportViaServer.mockClear();
    downloadBlob.mockClear();
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
    });
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
});

async function renderSheet(): Promise<void> {
    const { OrderSheet } = await import('../../components/OrderSheet');
    render(<OrderSheet open onClose={() => undefined} />);
}

describe('OrderSheet', () => {
    it('groups made rows by process and flags an inferred group as assumed', async () => {
        await renderSheet();
        const sheetCut = screen.getByTestId('order-group-sheet-cut');
        expect(within(sheetCut).getByText('plate')).toBeTruthy();
        expect(sheetCut.textContent).toContain('2');
        const print = screen.getByTestId('order-group-3d-print');
        expect(within(print).getByText('bracket')).toBeTruthy();
        expect(within(print).getByText('assumed')).toBeTruthy();
        expect(screen.getByTestId('order-group-cnc').textContent).toContain('lid');
        expect(screen.getByTestId('order-summary').textContent).toBe('4 made — 1 × 3d-print, 1 × cnc, 2 × sheet-cut · 6 bought');
    });

    it('shows the purchased part number and the McMaster pack caveat', async () => {
        await renderSheet();
        expect(screen.getByTestId('order-bought').textContent).toContain('91290A115');
        expect(screen.getByTestId('order-bought-mcmaster').textContent).toContain('91290A115');
        expect(screen.getByTestId('order-bought-mcmaster').textContent).toContain('Quantities mean packs — verify pack size.');
    });

    it('copies the exact McMaster handoff text', async () => {
        await renderSheet();
        fireEvent.click(screen.getByTestId('order-copy-mcmaster'));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith('91290A115\n'));
    });

    it('downloads the 3d-print group as an order pack filtered by process', async () => {
        await renderSheet();
        fireEvent.click(screen.getByTestId('order-pack-3d-print'));
        await waitFor(() => expect(exportViaServer).toHaveBeenCalledWith(
            'order-pack',
            'return 1;',
            expect.objectContaining({ exportOptions: { processes: ['3d-print'] } }),
        ));
        expect(downloadBlob).toHaveBeenCalledOnce();
    });

    it('downloads the BOM CSV', async () => {
        await renderSheet();
        fireEvent.click(screen.getByTestId('order-bom-csv'));
        await waitFor(() => expect(exportViaServer).toHaveBeenCalledWith('bom-csv', 'return 1;', {}));
    });

    it('builds the all-parts order pack with no process or item filters', async () => {
        await renderSheet();
        fireEvent.click(screen.getByTestId('order-pack-all'));
        await waitFor(() => expect(exportViaServer).toHaveBeenCalledWith('order-pack', 'return 1;', {}));
    });

    it('offers the exact DigiKey FastAdd cart link when every vendor PN is a DigiKey PN', async () => {
        const digikeyRow: BomRow = {
            ...defaultRows[2]!,
            name: 'digikey_screw',
            catalog: {
                id: 'digikey-296-1234-1-ND',
                vendor: 'DigiKey',
                partNumber: '296-1234-1-ND',
                source: null,
                license: 'MIT',
            },
        };
        rows = [defaultRows[0]!, digikeyRow];
        await renderSheet();
        const link = screen.getByText('Open DigiKey cart');
        expect(link.getAttribute('href')).toBe(
            'https://www.digikey.com/classic/ordering/fastadd.aspx?part1=296-1234-1-ND&qty1=4',
        );
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noreferrer');
    });

    it('hides the DigiKey cart link when a vendor PN is not a DigiKey PN', async () => {
        await renderSheet();
        expect(screen.queryByText('Open DigiKey cart')).toBeNull();
    });

    it('flags a purchased row without a part number and a fabricated row without a mass source', async () => {
        await renderSheet();
        expect(screen.getByTestId('order-state-4').textContent).toContain('needs-vendor-pn');
        expect(screen.getByTestId('order-state-5').textContent).toContain('needs-material');
        expect(screen.queryByTestId('order-state-3')).toBeNull();
        expect(screen.queryByTestId('order-state-1')).toBeNull();
        expect(screen.queryByTestId('order-state-2')).toBeNull();
    });

    it('keeps quote links at the exact clean URL and shows no disclosure when no vendor tag is configured', async () => {
        await renderSheet();
        const sheetCut = screen.getByTestId('order-group-sheet-cut');
        const link = within(sheetCut).getByText('SendCutSend');
        expect(link.getAttribute('href')).toBe('https://app.sendcutsend.com/');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noreferrer');
        expect(screen.queryByText(REFERRAL_DISCLOSURE)).toBeNull();
    });

    it('wraps quote links through buildVendorLink (surface export) and shows the disclosure when a tag is set', async () => {
        vi.stubEnv('KERNELCAD_REFERRAL_SENDCUTSEND', 'sheet-test');
        await renderSheet();
        const sheetCut = screen.getByTestId('order-group-sheet-cut');
        expect(within(sheetCut).getByText('SendCutSend').getAttribute('href')).toBe(
            'https://app.sendcutsend.com/?ref=sheet-test&utm_source=kernelcad&utm_medium=export',
        );
        expect(within(sheetCut).getByText(REFERRAL_DISCLOSURE)).toBeTruthy();
        expect(screen.queryByTestId('order-referral-3d-print')).toBeNull();
    });
});
