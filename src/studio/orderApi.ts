// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The two calls behind the Order button: ask for an estimate, then start the
// card hold. Both go to the hosted API (guests allowed; a signed-in user's
// bearer token rides along).
import { apiCall } from './api/apiBase';

export interface OrderEstimate {
    requestId: string;
    cents: number;
    summary: string;
}

interface ApiReply {
    ok?: boolean;
    message?: string;
    request_id?: string;
    estimate_cents?: number;
    summary?: string;
    url?: string;
    status?: string;
}

const FALLBACK = 'Ordering did not work just now. Please try again.';

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<ApiReply> {
    const { base, headers } = await apiCall();
    const root = base || import.meta.env.VITE_API_BASE_URL || '';
    let res: Response;
    try {
        res = await fetch(`${root}${path}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...headers },
            body: JSON.stringify(body),
            signal,
        });
    } catch (err) {
        if (signal?.aborted) throw err;
        throw new Error(FALLBACK);
    }
    const reply = (await res.json().catch(() => ({}))) as ApiReply;
    if (!res.ok || reply.ok === false) throw new Error(reply.message || FALLBACK);
    return reply;
}

/** Cheap pre-price: starts pricing on the server. Returns cents once the real price is known, else null. */
export async function requestPrice(source: string, slug: string | undefined, signal: AbortSignal): Promise<number | null> {
    const reply = await post('/api/v1/orders/price', slug ? { source, slug } : { source }, signal);
    if (reply.status === 'ready' && typeof reply.estimate_cents === 'number') return reply.estimate_cents;
    return null;
}

/** The order request once the real price is known, or null while the server is still pricing. */
export async function requestEstimate(source: string, slug: string | undefined, signal: AbortSignal): Promise<OrderEstimate | null> {
    const reply = await post('/api/v1/orders/estimate', slug ? { source, slug } : { source }, signal);
    if (reply.status === 'pricing') return null;
    if (!reply.request_id || typeof reply.estimate_cents !== 'number') throw new Error(FALLBACK);
    return { requestId: reply.request_id, cents: reply.estimate_cents, summary: reply.summary ?? '' };
}

export async function requestPayUrl(requestId: string): Promise<string> {
    const reply = await post(`/api/v1/orders/${encodeURIComponent(requestId)}/pay`, { return_url: window.location.href });
    if (!reply.url) throw new Error(FALLBACK);
    return reply.url;
}

export function formatDollars(cents: number): string {
    const dollars = cents / 100;
    return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}
