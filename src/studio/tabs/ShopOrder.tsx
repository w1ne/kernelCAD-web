// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Order from the Export tab: ask the shops for a price, then open the payment
// page of the offer the user picks. The server makes the file and the shop
// sets the price; the browser only sends the script and the offer id.
import { useState } from 'react';
import { Loader2, ShoppingBag } from 'lucide-react';
import { apiCall, rewritePath } from '../api/apiBase';
import type { JSX } from 'react';

interface ShopOfferRow {
    shop: string;
    /** "3D print, asa" or "aluminum 5052, 4.75 mm sheet". */
    what: string;
    totalCents: number;
    shippingLabel: string | null;
    offerId: string;
    shippingOptionId: string;
}

interface ShopOfferWire {
    shop?: string;
    process?: string | null;
    material?: string | null;
    thickness_mm?: number | null;
    total_cents?: number;
    shipping_label?: string | null;
    offer_id?: string;
    shipping_option_id?: string;
}

interface ShopQuoteWire {
    ok?: boolean;
    message?: string;
    offers?: ShopOfferWire[];
    recommended?: ShopOfferWire;
}

function shopOrigin(base: string): string {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return base;
    }
    return base || import.meta.env.VITE_API_BASE_URL || '';
}

async function postShop<T>(path: string, body: unknown): Promise<T> {
    const { base, headers } = await apiCall();
    const response = await fetch(rewritePath(path, shopOrigin(base)), {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    return await response.json() as T;
}

const PROCESS_WORDS: Record<string, string> = {
    sheetmetal: 'sheet',
    laser_cut: 'laser cut',
    fdm_print: '3D print',
    resin_print: 'resin print',
    powder_print: 'powder print',
    metal_print: 'metal print',
    cnc: 'CNC',
};

function describeOffer(row: ShopOfferWire): string {
    const material = row.material ? row.material.replace(/_/g, ' ') : null;
    if (typeof row.thickness_mm === 'number') {
        return [material, `${row.thickness_mm} mm sheet`].filter(Boolean).join(', ');
    }
    const process = row.process ? PROCESS_WORDS[row.process] ?? row.process : null;
    return [process, material].filter(Boolean).join(', ');
}

/** The cheapest offer per shop and make, three at most. */
function pickOffers(payload: ShopQuoteWire): ShopOfferRow[] {
    const rows = payload.offers && payload.offers.length > 0
        ? payload.offers
        : payload.recommended ? [payload.recommended] : [];
    const offers = rows.flatMap((row) => {
        if (!row.offer_id || !row.shipping_option_id || typeof row.total_cents !== 'number') return [];
        return [{
            shop: row.shop ?? 'shop',
            what: describeOffer(row),
            totalCents: row.total_cents,
            shippingLabel: row.shipping_label ?? null,
            offerId: row.offer_id,
            shippingOptionId: row.shipping_option_id,
        }];
    });
    const perMake = new Map<string, ShopOfferRow>();
    for (const offer of offers.sort((a, b) => a.totalCents - b.totalCents)) {
        const key = `${offer.shop}|${offer.what}`;
        if (!perMake.has(key)) perMake.set(key, offer);
    }
    return [...perMake.values()].slice(0, 3);
}

function openPaymentTab(): Window | null {
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    return tab;
}

function failureText(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

export function ShopOrder({ code }: { code: string }): JSX.Element {
    const [ordering, setOrdering] = useState(false);
    const [payingOffer, setPayingOffer] = useState<string | null>(null);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [shopOffers, setShopOffers] = useState<ShopOfferRow[]>([]);

    const askShops = () => {
        if (!code.trim()) return;
        setOrdering(true);
        setShopOffers([]);
        setOrderError(null);
        void postShop<ShopQuoteWire>('/__kernelcad/manufacture/shops', { source: code })
            .then((payload) => {
                const offers = pickOffers(payload);
                if (!payload.ok || offers.length === 0) {
                    setOrderError(payload.message ?? 'No shop returned a price.');
                    return;
                }
                setShopOffers(offers);
            })
            .catch((err: unknown) => setOrderError(failureText(err, 'The shop request failed.')))
            .finally(() => setOrdering(false));
    };

    const pay = (offer: ShopOfferRow) => {
        setPayingOffer(offer.offerId);
        setOrderError(null);
        // Open the tab inside the click, while the browser still counts it as
        // the user's action; a tab opened after the request is a blocked popup.
        const tab = openPaymentTab();
        void postShop<{ ok?: boolean; message?: string; checkout_url?: string }>(
            '/__kernelcad/manufacture/shops/order',
            { offer_id: offer.offerId, shipping_option_id: offer.shippingOptionId, return_url: window.location.href },
        )
            .then((payload) => {
                if (!payload.ok || !payload.checkout_url) {
                    tab?.close();
                    setOrderError(payload.message ?? 'The shop did not open a payment page.');
                    return;
                }
                if (tab) tab.location.href = payload.checkout_url;
                else window.location.assign(payload.checkout_url);
            })
            .catch((err: unknown) => {
                tab?.close();
                setOrderError(failureText(err, 'The payment page did not open.'));
            })
            .finally(() => setPayingOffer(null));
    };

    return (
        <>
            <button
                type="button"
                data-testid="export-order"
                disabled={ordering || !code.trim()}
                title="Ask the shops for a price, then open that shop's payment page."
                onClick={askShops}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-border bg-surface-1 text-fg text-xs disabled:opacity-50"
            >
                <span className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold">{ordering ? 'Asking shops…' : 'Order'}</span>
                    <span className="text-2xs text-fg-3">Get shop prices, then pay the one you pick</span>
                </span>
                {ordering ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ShoppingBag className="h-4 w-4 shrink-0" />}
            </button>
            {shopOffers.length > 0 && (
                <ul data-testid="shop-offer" className="m-0 flex flex-col gap-2 px-3 py-2 rounded border border-border text-[11px] text-fg">
                    {shopOffers.map((offer) => (
                        <li key={offer.offerId}>
                            <p className="m-0">{offer.shop}: {offer.what ? `${offer.what}, ` : ''}from ${(offer.totalCents / 100).toFixed(2)}</p>
                            {offer.shippingLabel && <p className="m-0 text-fg-3">{offer.shippingLabel}</p>}
                            <button
                                type="button"
                                data-testid="shop-pay"
                                disabled={payingOffer !== null}
                                className="mt-1 rounded border border-border-strong px-2 py-1 text-accent disabled:opacity-50"
                                onClick={() => pay(offer)}
                            >
                                {payingOffer === offer.offerId ? 'Opening payment…' : `Pay ${offer.shop}`}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {orderError && (
                <p role="alert" data-testid="export-order-error" className="text-[11px] text-danger">{orderError}</p>
            )}
        </>
    );
}
