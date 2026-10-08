// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { orderShop, quoteShops, type ExportFile } from './shopQuote';
import { wordsToGeometry } from '../../studio/wordsToGeometry';
import { runAndExport } from '../../agent/script-runtime/export';

beforeAll(async () => {
    await initOcct();
});

const PLATE = [
    "const width = param('width', 60, { min: 8, max: 800 });",
    "const height = param('height', 40, { min: 8, max: 800 });",
    "const thickness = param('thickness', 5, { min: 0.5, max: 25 });",
    "const holeD = param('holeD', 3.4, { min: 1, max: 30 });",
    'const plate = box(width, height, thickness);',
    'const margin = holeD.multiply(2);',
    'const drill = (x, y) => cylinder(thickness.add(2), holeD.divide(2)).translate(x, y, -1);',
    'const xFar = width.subtract(margin);',
    'const yFar = height.subtract(margin);',
    'return plate.subtract(drill(margin, margin), drill(xFar, margin), drill(margin, yFar), drill(xFar, yFar));',
].join('\n');

function jsonRpc(data: unknown): Response {
    return new Response(JSON.stringify({
        result: { structuredContent: data, content: [{ type: 'text', text: 'ok' }] },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
}

type Sent = { params: { name: string; arguments: Record<string, unknown> } };

function offer(id: string, shop: string, cents: number, spec: Record<string, unknown>, process = 'sheetmetal') {
    return {
        id,
        vendor_display_name: shop,
        process,
        total_from_cents: cents,
        price_basis: 'vendor_api',
        spec_resolved: spec,
        shipping_options: [{ id: 'standard', label: 'Standard', cost_cents: 0 }],
    };
}

function shopReturning(offers: unknown[]) {
    const sent: Sent[] = [];
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        sent.push(JSON.parse(String(init?.body)) as Sent);
        return jsonRpc({ quote_id: 'q_1', status: 'complete', offers });
    });
    return { sent, deps: { fetch: fetchImpl as unknown as typeof fetch, url: 'https://shops.test/mcp' } };
}

const bytes = Uint8Array.from([1, 2, 3]);

describe('quoteShops', () => {
    it('sends a flat plate as DXF with its thickness and drops offers in another gauge', async () => {
        const { sent, deps } = shopReturning([
            offer('of_thin', 'CFA Laser', 900, { material: 'mild_steel', thickness_in: 0.059 }),
            offer('of_ok', 'CFA Laser', 3841, { material: 'mild_steel', thickness_in: 0.187 }),
            offer('of_eu', 'LaserBoost', 9676, { material: 'aluminum_5754', thickness: '5 mm' }),
        ]);
        const exportFile: ExportFile = async () => ({ ok: true, bytes, sheet: { thicknessMm: 5, bendCount: 0 } });
        const quoted = await quoteShops(PLATE, { ...deps, exportFile });
        const args = sent[0]!.params.arguments;
        expect(args).toMatchObject({ process: 'sheetmetal', units: 'mm', thickness_in: 0.1969 });
        expect(args.bend_count).toBeUndefined();
        expect(String(args.design_file).startsWith('data:image/vnd.dxf;base64,')).toBe(true);
        expect(JSON.stringify(sent[0])).not.toContain('total_cents');
        if (!quoted.ok) throw new Error(quoted.message);
        expect(quoted.offers.map((row) => row.offer_id)).toEqual(['of_ok', 'of_eu']);
        expect(quoted).toMatchObject({ fabrication_file: 'dxf', thickness_mm: 5, recommended: { offer_id: 'of_ok', thickness_mm: 4.75 } });
    });

    it('sends a bent part as the formed STEP with its bends and drops offers that only cut', async () => {
        const { sent, deps } = shopReturning([
            offer('of_flat', 'RMFG', 92, { material: 'aluminum_5052', thickness_in: 0.08 }),
            offer('of_bent', 'SendCutSend', 3221, { material: 'aluminum_5052', thickness_in: 0.08, bends: 1 }),
        ]);
        const exportFile: ExportFile = async (_source, format) => ({
            ok: true,
            bytes,
            ...(format === 'dxf' ? { sheet: { thicknessMm: 2, bendCount: 1 } } : {}),
        });
        const quoted = await quoteShops(PLATE, { ...deps, exportFile });
        const args = sent[0]!.params.arguments;
        expect(args).toMatchObject({ process: 'sheetmetal', thickness_in: 0.0787, bend_count: 1 });
        expect(String(args.design_file).startsWith('data:model/step;base64,')).toBe(true);
        expect(quoted).toMatchObject({ ok: true, fabrication_file: 'step', offers: [{ offer_id: 'of_bent', bends: 1 }] });
    });

    it('sends a part that is not sheet to 3D-print and CNC shops, never to sheet shops', async () => {
        const { sent, deps } = shopReturning([
            offer('of_sheet', 'SendCutSend', 3221, { material: 'aluminum_5052', thickness_in: 0.125 }),
            offer('of_print', 'Weerg', 493, { material: 'asa' }, 'fdm_print'),
        ]);
        const exportFile: ExportFile = async (_source, format) => format === 'dxf'
            ? { ok: false, message: 'not flat' }
            : { ok: true, bytes };
        const quoted = await quoteShops('return cylinder(30, 4);', { ...deps, exportFile });
        const args = sent[0]!.params.arguments;
        expect(args.process).toBeUndefined();
        expect(args.processes).toEqual(['3d printing', 'cnc']);
        expect(quoted).toMatchObject({
            ok: true,
            thickness_mm: null,
            offers: [{ offer_id: 'of_print', process: 'fdm_print', material: 'asa' }],
        });
    });

    it('waits for a quote that is still pricing', async () => {
        const sent: Sent[] = [];
        const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body)) as Sent;
            sent.push(body);
            if (body.params.name === 'get_fabrication_quote') return jsonRpc({ quote_id: 'q_1', status: 'quoting', offers: [] });
            return jsonRpc({ quote_id: 'q_1', status: 'complete', offers: [offer('of_1', 'Weerg', 493, {}, 'fdm_print')] });
        });
        const quoted = await quoteShops(PLATE, {
            fetch: fetchImpl as unknown as typeof fetch,
            url: 'https://shops.test/mcp',
            exportFile: async (_source, format) => format === 'dxf' ? { ok: false, message: 'not flat' } : { ok: true, bytes },
        });
        expect(sent.map((body) => body.params.name)).toEqual(['get_fabrication_quote', 'finalize_quote']);
        expect(quoted).toMatchObject({ ok: true, recommended: { offer_id: 'of_1' } });
    });

    it('measures the sheet of the generate-page plate and L-bracket', async () => {
        const plate = wordsToGeometry('60x40x5 mm bracket with 4 M3 mounting holes');
        const bracket = wordsToGeometry('L-bracket 100x60x2 mm, 90° fold along x=50');
        if (!plate.ok || !bracket.ok) throw new Error('examples must build');
        const flat = await runAndExport({ code: plate.source, fileName: 'p.kcad.ts', format: 'dxf', options: { format: 'dxf' } });
        const bent = await runAndExport({ code: bracket.source, fileName: 'b.kcad.ts', format: 'dxf', options: { format: 'dxf' } });
        expect(flat.sheet?.bendCount).toBe(0);
        expect(flat.sheet?.thicknessMm).toBeCloseTo(5, 6);
        expect(bent.sheet).toEqual({ thicknessMm: 2, bendCount: 1 });
    });

    it.skipIf(!process.env.LIVE_SHOP)('asks the live shop network and opens its payment page', async () => {
        const quoted = await quoteShops(PLATE);
        if (!quoted.ok) throw new Error(`${quoted.code}: ${quoted.message}`);
        expect(quoted.recommended.total_cents).toBeGreaterThan(0);
        const failures: string[] = [];
        let checkoutUrl = '';
        for (const offer of quoted.offers) {
            const ordered = await orderShop({
                offer_id: offer.offer_id,
                shipping_option_id: offer.shipping_option_id,
            });
            if (ordered.ok && ordered.checkout_url.startsWith('https://')) {
                checkoutUrl = ordered.checkout_url;
                break;
            }
            failures.push(`${offer.shop}: ${ordered.ok ? 'no url' : ordered.message}`);
        }
        if (!checkoutUrl) throw new Error(failures.join(' | ') || 'no offers');
        expect(checkoutUrl.startsWith('https://')).toBe(true);
    }, 120_000);

    it('opens the shop payment page from the offer id', async () => {
        const fetchImpl = vi.fn(async () => jsonRpc({
            checkout_url: 'https://checkout.stripe.com/c/pay/cs_test',
            total_cents: 2600,
            order_id: 'ord_1',
        }));
        const ordered = await orderShop(
            { offer_id: 'of_low', shipping_option_id: 'standard', return_url: 'https://app.kernelcad.com/' },
            { fetch: fetchImpl as unknown as typeof fetch, url: 'https://shops.test/mcp' },
        );
        const sent = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
            params: { name: string; arguments: Record<string, unknown> };
        };
        expect(sent.params).toEqual({
            name: 'create_checkout',
            arguments: { offer_id: 'of_low', shipping_option_id: 'standard', return_url: 'https://app.kernelcad.com/' },
        });
        expect(ordered).toMatchObject({
            ok: true,
            checkout_url: 'https://checkout.stripe.com/c/pay/cs_test',
        });
    });
});
