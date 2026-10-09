// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../context/CodeContext', () => ({ useCode: () => ({ code: 'box(10,10,10)' }) }));
vi.mock('../api/apiBase', () => ({ apiCall: async () => ({ base: 'https://api.test', headers: {} }) }));

import { OrderButton } from '../OrderButton';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ESTIMATE = {
    ok: true, request_id: 'r1', estimate_cents: 4400, currency: 'usd', method: {},
    summary: 'Sheet-metal mild steel 4.78 mm, 1 pc - about $44, confirmed by a person before your card is charged',
};

let calls: string[];
beforeEach(() => { calls = []; window.history.replaceState({}, '', '/'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockFetch(pay: () => Response) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = String(input);
        calls.push(url);
        return url.endsWith('/estimate') ? json(ESTIMATE) : pay();
    });
}

describe('OrderButton', () => {
    it('shows the estimate and a Pay button', async () => {
        mockFetch(() => json({ ok: true, url: 'https://checkout.stripe.com/x' }));
        render(<OrderButton />);
        fireEvent.click(screen.getByTestId('toolbar-order'));
        expect(screen.getByText(/Asking makers/)).toBeTruthy();
        expect((await screen.findByTestId('order-summary')).textContent).toContain('about $44');
        expect(screen.getByRole('button', { name: 'Pay $44' })).toBeTruthy();
        expect(calls[0]).toBe('https://api.test/api/v1/orders/estimate');
    });

    it('opens the tab in the click, then points it at checkout with opener nulled', async () => {
        const order: string[] = [];
        const tab = { opener: 'x' as unknown, close: vi.fn(), location: { href: '' } };
        const open = vi.spyOn(window, 'open').mockImplementation(() => { order.push('open'); return tab as unknown as Window; });
        mockFetch(() => { order.push('pay'); return json({ ok: true, url: 'https://checkout.stripe.com/x' }); });
        render(<OrderButton />);
        fireEvent.click(screen.getByTestId('toolbar-order'));
        fireEvent.click(await screen.findByRole('button', { name: 'Pay $44' }));
        await waitFor(() => expect(tab.location.href).toBe('https://checkout.stripe.com/x'));
        expect(open).toHaveBeenCalledWith('about:blank', '_blank');
        expect(order).toEqual(['open', 'pay']);
        expect(tab.opener).toBeNull();
    });

    it('shows the server message and closes the tab on a pay error', async () => {
        const tab = { opener: null, close: vi.fn(), location: { href: '' } };
        vi.spyOn(window, 'open').mockImplementation(() => tab as unknown as Window);
        mockFetch(() => json({ ok: false, message: 'Payments are paused.' }, 400));
        render(<OrderButton />);
        fireEvent.click(screen.getByTestId('toolbar-order'));
        fireEvent.click(await screen.findByRole('button', { name: 'Pay $44' }));
        expect((await screen.findByRole('alert')).textContent).toBe('Payments are paused.');
        expect(tab.close).toHaveBeenCalled();
    });

    it('shows the server message when the estimate fails', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ok: false, code: 'x', message: 'No maker can make this.' }, 422));
        render(<OrderButton />);
        fireEvent.click(screen.getByTestId('toolbar-order'));
        expect((await screen.findByRole('alert')).textContent).toBe('No maker can make this.');
    });

    it('starts the estimate by itself on ?order=1', async () => {
        window.history.replaceState({}, '', '/?order=1');
        mockFetch(() => json({ ok: true, url: 'u' }));
        render(<OrderButton />);
        expect(await screen.findByTestId('order-summary')).toBeTruthy();
        expect(calls).toHaveLength(1);
    });
});
