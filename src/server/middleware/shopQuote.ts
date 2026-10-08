// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Studio asks the fabrication network for a shop price. The browser sends the
// kernelCAD script. This process makes the file, and the shop sets the price.
// Checkout takes an offer id, never an amount.

const SHOP_MCP_URL = 'https://agenticfabricationnetwork.ai/mcp';

export interface ShopOffer {
    readonly offer_id: string;
    readonly shop: string;
    readonly total_cents: number;
    readonly shipping_option_id: string;
    readonly shipping_label: string | null;
}

export interface ShopQuoteOk {
    readonly ok: true;
    readonly fabrication_file: 'dxf' | 'step';
    readonly recommended: ShopOffer;
    readonly offers: ShopOffer[];
}

export interface ShopOrderOk {
    readonly ok: true;
    readonly checkout_url: string;
    readonly total_cents: number | null;
    readonly order_id: string | null;
}

export interface ShopFail {
    readonly ok: false;
    readonly code: string;
    readonly message: string;
}

export type ExportFile = (
    source: string,
    format: 'dxf' | 'step',
) => Promise<{ ok: true; bytes: Uint8Array } | { ok: false; message: string }>;

export interface ShopDeps {
    readonly fetch?: typeof fetch;
    readonly url?: string;
    readonly exportFile?: ExportFile;
    readonly timeoutMs?: number;
}

function fail(code: string, message: string): ShopFail {
    return { ok: false, code, message };
}

async function callShop(
    name: string,
    args: Record<string, unknown>,
    deps: ShopDeps,
): Promise<Record<string, unknown> | ShopFail> {
    const fetchImpl = deps.fetch ?? fetch;
    let response: Response;
    try {
        response = await fetchImpl(deps.url ?? SHOP_MCP_URL, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: { name, arguments: args },
            }),
            signal: AbortSignal.timeout(deps.timeoutMs ?? 55_000),
        });
    } catch (err) {
        return fail('shop.upstream', err instanceof Error ? err.message : 'The shop network did not answer.');
    }
    const raw = await response.text();
    let payload: unknown = null;
    try {
        payload = raw ? JSON.parse(raw) : null;
    } catch {
        return fail('shop.upstream', 'The shop network returned a page, not a quote.');
    }
    if (!response.ok) return fail('shop.upstream', `The shop network returned ${response.status}.`);
    const envelope = payload && typeof payload === 'object'
        ? payload as { result?: { structuredContent?: unknown; isError?: boolean }; error?: { message?: unknown } }
        : {};
    const blocks = envelope.result && Array.isArray((envelope.result as { content?: unknown }).content)
        ? (envelope.result as { content: Array<{ text?: unknown }> }).content
        : [];
    const text = blocks.map((block) => typeof block.text === 'string' ? block.text : '').filter(Boolean).join('\n');
    if (envelope.error) {
        const message = typeof envelope.error.message === 'string' ? envelope.error.message : 'The shop network refused the call.';
        return fail('shop.upstream', message);
    }
    if (envelope.result?.isError) return fail('shop.upstream', text || 'The shop network could not price this file.');
    const data = envelope.result?.structuredContent;
    if (!data || typeof data !== 'object') return fail('shop.upstream', 'The shop network returned no quote.');
    return data as Record<string, unknown>;
}

function offerOf(raw: unknown): ShopOffer | null {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const offerId = typeof row.offer_id === 'string' ? row.offer_id : row.id;
    if (typeof offerId !== 'string') return null;
    if (typeof row.total_from_cents !== 'number') return null;
    const shipping = Array.isArray(row.shipping_options)
        ? row.shipping_options.find((item) => item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') as { id: string; label?: unknown } | undefined
        : undefined;
    if (!shipping) return null;
    const shop = typeof row.vendor_display_name === 'string'
        ? row.vendor_display_name
        : typeof row.vendor === 'string' ? row.vendor : 'shop';
    return {
        offer_id: offerId,
        shop,
        total_cents: row.total_from_cents,
        shipping_option_id: shipping.id,
        shipping_label: typeof shipping.label === 'string' ? shipping.label : null,
    };
}

function recommend(offers: ShopOffer[], rows: unknown[]): ShopOffer | null {
    const liveIds = new Set(rows.flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const row = raw as { id?: unknown; offer_id?: unknown; price_basis?: unknown };
        if (row.price_basis !== 'vendor_api') return [];
        const id = typeof row.offer_id === 'string' ? row.offer_id : row.id;
        return typeof id === 'string' ? [id] : [];
    }));
    const pool = offers.filter((offer) => liveIds.size === 0 || liveIds.has(offer.offer_id));
    return pool.reduce<ShopOffer | null>((best, offer) => {
        if (!best || offer.total_cents < best.total_cents) return offer;
        return best;
    }, null);
}

async function defaultExport(source: string, format: 'dxf' | 'step') {
    const { runAndExport } = await import('../../agent/script-runtime/export');
    const made = await runAndExport({
        code: source,
        fileName: 'shop.kcad.ts',
        format,
        options: format === 'dxf' ? { format: 'dxf' } : { format: 'step' },
    });
    if (made.bytes.length === 0) {
        const message = made.diagnostics.find((item) => item.severity === 'error')?.message
            ?? 'The part did not become a fabrication file.';
        return { ok: false as const, message };
    }
    return { ok: true as const, bytes: made.bytes };
}

function mime(format: 'dxf' | 'step'): string {
    return format === 'dxf' ? 'image/vnd.dxf' : 'model/step';
}

export async function quoteShops(source: string, deps: ShopDeps = {}): Promise<ShopQuoteOk | ShopFail> {
    if (!source.trim()) return fail('shop.source.missing', 'Open a part first.');
    const exportFile = deps.exportFile ?? defaultExport;
    let format: 'dxf' | 'step' = 'dxf';
    let made = await exportFile(source, format);
    if (!made.ok) {
        format = 'step';
        made = await exportFile(source, format);
    }
    if (!made.ok) return fail('shop.build.failed', made.message);
    const started = await callShop('get_fabrication_quote', {
        process: 'sheetmetal',
        quantities: [1],
        design_file: `data:${mime(format)};base64,${Buffer.from(made.bytes).toString('base64')}`,
    }, deps);
    if ('ok' in started && started.ok === false) return started;
    let data = started;
    const quoteId = typeof data.quote_id === 'string' ? data.quote_id : null;
    const early = Array.isArray(data.offers) ? data.offers : [];
    if (quoteId && data.status === 'quoting' && early.length === 0) {
        const finished = await callShop('finalize_quote', { quote_id: quoteId }, deps);
        if (!('ok' in finished && finished.ok === false)) data = finished;
    }
    const rows = Array.isArray(data.offers) ? data.offers : [];
    const offers = rows.flatMap((row) => {
        const offer = offerOf(row);
        return offer ? [offer] : [];
    });
    const recommended = recommend(offers, rows);
    if (!recommended) return fail('shop.none', 'No shop returned a price for this plate.');
    return { ok: true, fabrication_file: format, recommended, offers };
}

export async function orderShop(
    input: { offer_id: string; shipping_option_id: string },
    deps: ShopDeps = {},
): Promise<ShopOrderOk | ShopFail> {
    if (!input.offer_id || !input.shipping_option_id) {
        return fail('shop.offer.missing', 'Choose a shop offer first.');
    }
    const opened = await callShop('create_checkout', {
        offer_id: input.offer_id,
        shipping_option_id: input.shipping_option_id,
    }, deps);
    if ('ok' in opened && opened.ok === false) return opened;
    const checkoutUrl = typeof opened.checkout_url === 'string' ? opened.checkout_url : null;
    if (!checkoutUrl) return fail('shop.checkout.missing', 'The shop did not open a payment page.');
    return {
        ok: true,
        checkout_url: checkoutUrl,
        total_cents: typeof opened.total_cents === 'number' ? opened.total_cents : null,
        order_id: typeof opened.order_id === 'string' ? opened.order_id : null,
    };
}
