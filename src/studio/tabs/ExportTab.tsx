// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState } from 'react';
import { Download, Loader2, ShoppingBag } from 'lucide-react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useCode } from '../context/CodeContext';
import { apiCall, rewritePath } from '../api/apiBase';
import { downloadBlob, exportViaServer, type StudioExportFormat } from '../exportViaServer';
import { EXPORT_FORMATS as FORMATS, hasPlanarSource } from '../exportFormats';
import { useExportTask } from '../hooks/useExportTask';
import { ExportStatus } from '../components/Shared/ExportStatus';
import type { JSX } from 'react';

// Studio Export tab. Slice 1.4 + Slice A export-trio.
//
// Talks to /__kernelcad/export via exportViaServer (same path as the Header
// STL/STEP buttons) which runs runAndExport on the node OCCT kernel.
// Slice A widens the format set from {stl, step} to the five Slice A
// targets: stl, step, dxf, 3mf, glb.
//
// Visibility is adaptive: ExportTab is only rendered by Inspector when
// the recompute result has at least one geometry. See
// src/studio/logic/adaptiveTabs.ts. DXF additionally requires at least
// one planar face in the scene — non-planar 3D solids hit
// export.dxf.non-planar on the runtime side, so the button is disabled
// adaptively in the UI to surface that constraint earlier.
//
// Progress, cancel, the server's error hint and the shipped-with-warning
// notice come from useExportTask / ExportStatus (shared with the header).

type ExportFormat = StudioExportFormat;

interface ShopOfferRow {
    shop: string;
    totalCents: number;
    shippingLabel: string | null;
    offerId: string;
    shippingOptionId: string;
    file: string;
}

function shopOrigin(base: string): string {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return base;
    }
    return base || import.meta.env.VITE_API_BASE_URL || '';
}

export function ExportTab(): JSX.Element {
    const { geometries } = useRecomputeResult();
    const { code } = useCode();
    const [ordering, setOrdering] = useState(false);
    const [paying, setPaying] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [shopOffers, setShopOffers] = useState<ShopOfferRow[]>([]);
    const task = useExportTask();
    const { start } = task;
    const pending = FORMATS.find((f) => f.label === task.state.running)?.id ?? null;

    const hasPlanar = hasPlanarSource(geometries);

    const handleExport = useCallback((format: ExportFormat) => {
        const label = FORMATS.find((f) => f.id === format)?.label ?? format.toUpperCase();
        void start(label, (options) => exportViaServer(format, code, options), downloadBlob);
    }, [code, start]);

    if (geometries.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500 text-xs"
                data-testid="export-tab-empty"
            >
                <p>Nothing to export — the script has not yet produced geometry.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-3" data-testid="export-tab">
            <p className="text-[11px] text-gray-500">
                Exports run on the server and stream a download.
            </p>

            <ul className="flex flex-col gap-2">
                {FORMATS.map((f) => {
                    const isPending = pending === f.id;
                    const planarBlocked = f.requiresPlanar === true && !hasPlanar;
                    const disabled = pending !== null || planarBlocked;
                    const help = planarBlocked
                        ? `${f.help} (no planar source available)`
                        : f.help;
                    return (
                        <li key={f.id}>
                            <button
                                type="button"
                                onClick={() => handleExport(f.id)}
                                disabled={disabled}
                                data-testid={`export-${f.id}`}
                                title={planarBlocked
                                    ? 'DXF export needs a planar face or sheet-metal flat pattern.'
                                    : undefined}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-[#2b313c] bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 text-xs transition-colors"
                            >
                                <span className="flex flex-col items-start gap-0.5">
                                    <span className="font-semibold">{f.label}</span>
                                    <span className="text-2xs text-gray-500">{help}</span>
                                </span>
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                ) : (
                                    <Download className="h-4 w-4 shrink-0" />
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <button
                type="button"
                data-testid="export-order"
                disabled={ordering || !code.trim()}
                title="Ask the shops for a price, then open that shop's payment page."
                onClick={() => {
                    if (!code.trim()) return;
                    setOrdering(true);
                    setShopOffers([]);
                    setOrderError(null);
                    void (async () => {
                        const { base, headers } = await apiCall();
                        const response = await fetch(rewritePath('/__kernelcad/manufacture/shops', shopOrigin(base)), {
                            method: 'POST',
                            headers: { ...headers, 'content-type': 'application/json' },
                            body: JSON.stringify({ source: code }),
                        });
                        const payload = await response.json() as {
                            ok?: boolean;
                            message?: string;
                            fabrication_file?: string;
                            offers?: Array<{
                                shop?: string;
                                total_cents?: number;
                                shipping_label?: string | null;
                                offer_id?: string;
                                shipping_option_id?: string;
                            }>;
                            recommended?: {
                                shop?: string;
                                total_cents?: number;
                                shipping_label?: string | null;
                                offer_id?: string;
                                shipping_option_id?: string;
                            };
                        };
                        const rows = payload.offers && payload.offers.length > 0
                            ? payload.offers
                            : payload.recommended ? [payload.recommended] : [];
                        const offers = rows.flatMap((row) => {
                            if (!row.offer_id || !row.shipping_option_id || typeof row.total_cents !== 'number') return [];
                            return [{
                                shop: row.shop ?? 'shop',
                                totalCents: row.total_cents,
                                shippingLabel: row.shipping_label ?? null,
                                offerId: row.offer_id,
                                shippingOptionId: row.shipping_option_id,
                                file: payload.fabrication_file ?? 'step',
                            }];
                        });
                        if (!payload.ok || offers.length === 0) {
                            setOrderError(payload.message ?? 'No shop returned a price.');
                            return;
                        }
                        setShopOffers(offers);
                    })().catch((err: unknown) => {
                        setOrderError(err instanceof Error ? err.message : 'The shop request failed.');
                    }).finally(() => setOrdering(false));
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-emerald-900 bg-[#14211b] text-gray-200 text-xs disabled:opacity-50"
            >
                <span className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold">{ordering ? 'Asking shops…' : 'Order'}</span>
                    <span className="text-2xs text-gray-500">Ask the shops, then pay the one that prices it</span>
                </span>
                {ordering ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ShoppingBag className="h-4 w-4 shrink-0" />}
            </button>
            {shopOffers.length > 0 && (
                <ul data-testid="shop-offer" className="m-0 flex flex-col gap-2 px-3 py-2 rounded border border-emerald-900 text-[11px] text-gray-200">
                    {shopOffers.map((offer) => (
                        <li key={offer.offerId}>
                            <p className="m-0">{offer.shop} prices this {offer.file.toUpperCase()} at ${(offer.totalCents / 100).toFixed(2)}{offer.shippingLabel ? `, ${offer.shippingLabel}` : ''}.</p>
                            <button
                                type="button"
                                data-testid="shop-pay"
                                disabled={paying}
                                className="mt-1 rounded border border-emerald-800 px-2 py-1 text-emerald-300 disabled:opacity-50"
                                onClick={() => {
                                    setPaying(true);
                                    setOrderError(null);
                                    void (async () => {
                                        const { base, headers } = await apiCall();
                                        const response = await fetch(rewritePath('/__kernelcad/manufacture/shops/order', shopOrigin(base)), {
                                            method: 'POST',
                                            headers: { ...headers, 'content-type': 'application/json' },
                                            body: JSON.stringify({
                                                offer_id: offer.offerId,
                                                shipping_option_id: offer.shippingOptionId,
                                            }),
                                        });
                                        const payload = await response.json() as { ok?: boolean; message?: string; checkout_url?: string };
                                        if (!payload.ok || !payload.checkout_url) {
                                            setOrderError(payload.message ?? 'The shop did not open a payment page.');
                                            return;
                                        }
                                        window.open(payload.checkout_url, '_blank', 'noopener');
                                    })().catch((err: unknown) => {
                                        setOrderError(err instanceof Error ? err.message : 'The payment page did not open.');
                                    }).finally(() => setPaying(false));
                                }}
                            >
                                {paying ? 'Opening payment…' : `Pay ${offer.shop}`}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {orderError && (
                <p role="alert" data-testid="export-order-error" className="text-[11px] text-red-300">{orderError}</p>
            )}

            <ExportStatus task={task} testId="export-tab-status" />
        </div>
    );
}

export default ExportTab;
