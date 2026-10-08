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
    /** How the shop makes it: sheetmetal, fdm_print, cnc, ... */
    readonly process: string | null;
    readonly material: string | null;
    /** Sheet the shop quoted, in mm; null for non-sheet processes. */
    readonly thickness_mm: number | null;
    /** Bends the shop priced; 0 when it only cuts. */
    readonly bends: number;
}

export interface ShopQuoteOk {
    readonly ok: true;
    readonly fabrication_file: 'dxf' | 'step';
    /** Sheet thickness the part asked for, in mm; null when it is not sheet. */
    readonly thickness_mm: number | null;
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

export interface SheetInfo {
    readonly thicknessMm: number;
    readonly bendCount: number;
}

export type ExportFile = (
    source: string,
    format: 'dxf' | 'step',
) => Promise<{ ok: true; bytes: Uint8Array; sheet?: SheetInfo } | { ok: false; message: string }>;

export interface ShopDeps {
    readonly fetch?: typeof fetch;
    readonly url?: string;
    readonly exportFile?: ExportFile;
    readonly timeoutMs?: number;
}

function fail(code: string, message: string): ShopFail {
    return { ok: false, code, message };
}

function isShopFail(value: Record<string, unknown> | ShopFail): value is ShopFail {
    return value.ok === false && typeof value.code === 'string';
}

type McpEnvelope = {
    result?: { structuredContent?: unknown; isError?: boolean; content?: unknown };
    error?: { message?: unknown };
};

function replyText(envelope: McpEnvelope): string {
    const blocks = Array.isArray(envelope.result?.content)
        ? envelope.result.content as Array<{ text?: unknown }>
        : [];
    return blocks.map((block) => typeof block.text === 'string' ? block.text : '').filter(Boolean).join('\n');
}

async function readShopReply(response: Response): Promise<Record<string, unknown> | ShopFail> {
    const raw = await response.text();
    let payload: unknown = null;
    try {
        payload = raw ? JSON.parse(raw) : null;
    } catch {
        return fail('shop.upstream', 'The shop network returned a page, not a quote.');
    }
    if (!response.ok) return fail('shop.upstream', `The shop network returned ${response.status}.`);
    const envelope: McpEnvelope = payload && typeof payload === 'object' ? payload as McpEnvelope : {};
    if (envelope.error) {
        const message = typeof envelope.error.message === 'string' ? envelope.error.message : 'The shop network refused the call.';
        return fail('shop.upstream', message);
    }
    if (envelope.result?.isError) return fail('shop.upstream', replyText(envelope) || 'The shop network could not price this file.');
    const data = envelope.result?.structuredContent;
    if (!data || typeof data !== 'object') return fail('shop.upstream', 'The shop network returned no quote.');
    return data as Record<string, unknown>;
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
    return readShopReply(response);
}

const SHEET_PROCESSES = new Set(['sheetmetal', 'laser_cut']);
/** A shop that quotes a sheet this far off the asked thickness is quoting
 *  a different part. */
const THICKNESS_TOLERANCE = 0.2;

function str(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function firstShipping(row: Record<string, unknown>): { id: string; label?: unknown } | undefined {
    if (!Array.isArray(row.shipping_options)) return undefined;
    return row.shipping_options.find((item) => item && typeof item === 'object'
        && typeof (item as { id?: unknown }).id === 'string') as { id: string; label?: unknown } | undefined;
}

function offerOf(raw: unknown): ShopOffer | null {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const offerId = str(row.offer_id) ?? str(row.id);
    const shipping = firstShipping(row);
    if (!offerId || typeof row.total_from_cents !== 'number' || !shipping) return null;
    const spec = row.spec_resolved && typeof row.spec_resolved === 'object'
        ? row.spec_resolved as Record<string, unknown>
        : {};
    return {
        offer_id: offerId,
        shop: str(row.vendor_display_name) ?? str(row.vendor) ?? 'shop',
        total_cents: row.total_from_cents,
        shipping_option_id: shipping.id,
        shipping_label: str(shipping.label),
        process: str(row.process),
        material: str(spec.material),
        thickness_mm: specThicknessMm(spec),
        bends: typeof spec.bends === 'number' ? spec.bends : 0,
    };
}

/** `thickness_in: 0.08`, or a label like "2 mm" / "0.125 in (8 ga)". */
function specThicknessMm(spec: Record<string, unknown>): number | null {
    if (typeof spec.thickness_in === 'number') return Math.round(spec.thickness_in * 25.4 * 100) / 100;
    const label = typeof spec.thickness === 'string' ? spec.thickness.match(/^([\d.]+)\s*(mm|in)\b/) : null;
    if (!label) return null;
    const value = Number(label[1]);
    return Math.round((label[2] === 'in' ? value * 25.4 : value) * 100) / 100;
}

/** Keeps offers that make the part that was asked for: the right sheet for a
 *  sheet part, and no sheet offer at all for a part that is not sheet. */
function fitsPart(offer: ShopOffer, sheet: SheetInfo | null): boolean {
    const sheetOffer = offer.process !== null && SHEET_PROCESSES.has(offer.process);
    if (sheet === null) return !sheetOffer;
    if (!sheetOffer || offer.bends < sheet.bendCount) return false;
    const thicknessMm = sheet.thicknessMm;
    if (offer.thickness_mm === null) return true;
    return Math.abs(offer.thickness_mm - thicknessMm) <= thicknessMm * THICKNESS_TOLERANCE;
}

async function defaultExport(source: string, format: 'dxf' | 'step') {
    // This process builds the part itself; nothing else may have loaded OCCT.
    const { initOcct } = await import('../../kernel/backends/occt/occtBackend');
    await initOcct();
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
    return { ok: true as const, bytes: made.bytes, ...(made.sheet ? { sheet: made.sheet } : {}) };
}

function dataUrl(format: 'dxf' | 'step', bytes: Uint8Array): string {
    const mime = format === 'dxf' ? 'image/vnd.dxf' : 'model/step';
    return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

interface ShopRequest {
    readonly format: 'dxf' | 'step';
    readonly sheet: SheetInfo | null;
    readonly args: Record<string, unknown>;
}

/** A flat sheet part goes out as its DXF and a bent one as its formed STEP
 *  (shops cut a DXF flat), both with the sheet thickness and bend count the
 *  file does not carry. Any other part goes out as STEP to the 3D-print and
 *  CNC shops. */
async function shopRequest(source: string, exportFile: ExportFile): Promise<ShopRequest | ShopFail> {
    const flat = await exportFile(source, 'dxf');
    const sheet = flat.ok && flat.sheet ? flat.sheet : null;
    if (flat.ok && sheet && sheet.bendCount === 0) {
        return { format: 'dxf', sheet, args: { ...sheetArgs(sheet), units: 'mm', design_file: dataUrl('dxf', flat.bytes) } };
    }
    const solid = await exportFile(source, 'step');
    if (!solid.ok) return fail('shop.build.failed', solid.message);
    const design_file = dataUrl('step', solid.bytes);
    if (sheet) return { format: 'step', sheet, args: { ...sheetArgs(sheet), design_file } };
    return { format: 'step', sheet: null, args: { processes: ['3d printing', 'cnc'], design_file } };
}

function sheetArgs(sheet: SheetInfo): Record<string, unknown> {
    return {
        process: 'sheetmetal',
        thickness_in: Math.round((sheet.thicknessMm / 25.4) * 10000) / 10000,
        ...(sheet.bendCount > 0 ? { bend_count: sheet.bendCount } : {}),
    };
}

/** One row per shop, process, material and price, cheapest first. */
function uniqueOffers(rows: unknown[], sheet: SheetInfo | null): ShopOffer[] {
    const seen = new Set<string>();
    return rows.flatMap((row: unknown) => {
        const offer = offerOf(row);
        if (!offer || !fitsPart(offer, sheet)) return [];
        const key = `${offer.shop}|${offer.process}|${offer.material}|${offer.total_cents}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [offer];
    }).sort((a, b) => a.total_cents - b.total_cents);
}

async function finishedQuote(started: Record<string, unknown>, deps: ShopDeps): Promise<Record<string, unknown>> {
    const quoteId = str(started.quote_id);
    const early = Array.isArray(started.offers) ? started.offers : [];
    if (!quoteId || started.status !== 'quoting' || early.length > 0) return started;
    const finished = await callShop('finalize_quote', { quote_id: quoteId }, deps);
    return isShopFail(finished) ? started : finished;
}

export async function quoteShops(source: string, deps: ShopDeps = {}): Promise<ShopQuoteOk | ShopFail> {
    if (!source.trim()) return fail('shop.source.missing', 'Open a part first.');
    const request = await shopRequest(source, deps.exportFile ?? defaultExport);
    if ('ok' in request) return request;
    const started = await callShop('get_fabrication_quote', { quantities: [1], ...request.args }, deps);
    if (isShopFail(started)) return started;
    const data = await finishedQuote(started, deps);
    const offers = uniqueOffers(Array.isArray(data.offers) ? data.offers : [], request.sheet);
    const recommended = offers[0];
    if (!recommended) {
        return fail('shop.none', request.sheet === null
            ? 'No 3D-print or CNC shop returned a price for this part.'
            : `No shop returned a price for this part in ${request.sheet.thicknessMm} mm sheet.`);
    }
    return {
        ok: true,
        fabrication_file: request.format,
        thickness_mm: request.sheet?.thicknessMm ?? null,
        recommended,
        offers,
    };
}

export async function orderShop(
    input: { offer_id: string; shipping_option_id: string; return_url?: string },
    deps: ShopDeps = {},
): Promise<ShopOrderOk | ShopFail> {
    if (!input.offer_id || !input.shipping_option_id) {
        return fail('shop.offer.missing', 'Choose a shop offer first.');
    }
    const returnUrl = input.return_url && /^https?:\/\//.test(input.return_url) ? input.return_url : null;
    const opened = await callShop('create_checkout', {
        offer_id: input.offer_id,
        shipping_option_id: input.shipping_option_id,
        ...(returnUrl ? { return_url: returnUrl } : {}),
    }, deps);
    if (isShopFail(opened)) return opened;
    const checkoutUrl = str(opened.checkout_url);
    if (!checkoutUrl) return fail('shop.checkout.missing', 'The shop did not open a payment page.');
    return {
        ok: true,
        checkout_url: checkoutUrl,
        total_cents: typeof opened.total_cents === 'number' ? opened.total_cents : null,
        order_id: str(opened.order_id),
    };
}
