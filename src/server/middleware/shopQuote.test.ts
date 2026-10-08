// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { orderShop, quoteShops } from './shopQuote';

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

describe('quoteShops', () => {
    it('sends a bent part as the formed STEP and recommends the live price', async () => {
        const bodies: Array<{ params: { name: string; arguments: Record<string, unknown> } }> = [];
        const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body)) as { params: { name: string; arguments: Record<string, unknown> } };
            bodies.push(body);
            if (body.params.name === 'get_fabrication_quote') {
                return jsonRpc({ quote_id: 'q_1', status: 'quoting', offers: [] });
            }
            return jsonRpc({
                quote_id: 'q_1',
                status: 'complete',
                offers: [
                    {
                        id: 'of_high',
                        vendor_display_name: 'Sculpteo',
                        total_from_cents: 5000,
                        price_basis: 'vendor_api',
                        shipping_options: [{ id: 'slow', label: 'Slow', cost_cents: 1000 }],
                    },
                    {
                        id: 'of_low',
                        vendor_display_name: 'Weerg',
                        total_from_cents: 2600,
                        price_basis: 'vendor_api',
                        shipping_options: [{ id: 'standard', label: 'Standard', cost_cents: 600 }],
                    },
                ],
            });
        });
        const quoted = await quoteShops(PLATE, {
            fetch: fetchImpl as unknown as typeof fetch,
            url: 'https://shops.test/mcp',
            exportFile: async (_source, format) => ({
                ok: true,
                bytes: format === 'dxf' ? new TextEncoder().encode('0\nLINE\n  8\nBEND\n') : Uint8Array.from([1, 2, 3]),
            }),
        });
        expect(bodies[0]?.params.name).toBe('get_fabrication_quote');
        expect(bodies[0]?.params.arguments.process).toBe('sheetmetal');
        expect(bodies[0]?.params.arguments.design_file).toBe('data:model/step;base64,AQID');
        expect(JSON.stringify(bodies[0])).not.toContain('total_cents');
        expect(bodies[1]?.params.name).toBe('finalize_quote');
        expect(quoted).toMatchObject({
            ok: true,
            fabrication_file: 'step',
            recommended: { offer_id: 'of_low', shop: 'Weerg', total_cents: 2600, shipping_option_id: 'standard' },
        });
    });

    it('refuses a part with no flat outline before asking any shop', async () => {
        const fetchImpl = vi.fn();
        const quoted = await quoteShops('return cylinder(30, 4);', {
            fetch: fetchImpl as unknown as typeof fetch,
            url: 'https://shops.test/mcp',
            exportFile: async (_source, format) => format === 'dxf'
                ? { ok: false, message: 'not flat' }
                : { ok: true, bytes: Uint8Array.from([1, 2, 3]) },
        });
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(quoted).toMatchObject({ ok: false, code: 'shop.not_sheet' });
    });

    it('exports the parametric plate to a real shop file before asking', async () => {
        const bodies: Array<{ params: { arguments: { design_file?: string } } }> = [];
        const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
            bodies.push(JSON.parse(String(init?.body)));
            return jsonRpc({
                quote_id: 'q_plate',
                status: 'complete',
                offers: [{
                    id: 'of_plate',
                    vendor_display_name: 'Weerg',
                    total_from_cents: 1800,
                    price_basis: 'vendor_api',
                    shipping_options: [{ id: 'standard', label: 'Standard', cost_cents: 400 }],
                }],
            });
        });
        const quoted = await quoteShops(PLATE, {
            fetch: fetchImpl as unknown as typeof fetch,
            url: 'https://shops.test/mcp',
        });
        if (!quoted.ok) throw new Error(`${quoted.code}: ${quoted.message}`);
        const file = bodies[0]?.params.arguments.design_file ?? '';
        expect(file.startsWith('data:image/vnd.dxf;base64,')).toBe(true);
        expect(file.length).toBeGreaterThan(40);
        expect(quoted).toMatchObject({ ok: true, recommended: { shop: 'Weerg' } });
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
            { offer_id: 'of_low', shipping_option_id: 'standard' },
            { fetch: fetchImpl as unknown as typeof fetch, url: 'https://shops.test/mcp' },
        );
        const sent = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
            params: { name: string; arguments: Record<string, unknown> };
        };
        expect(sent.params).toEqual({
            name: 'create_checkout',
            arguments: { offer_id: 'of_low', shipping_option_id: 'standard' },
        });
        expect(ordered).toMatchObject({
            ok: true,
            checkout_url: 'https://checkout.stripe.com/c/pay/cs_test',
        });
    });
});
