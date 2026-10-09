// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Order on the viewer toolbar: one button, one estimate line, one Pay button.
// Pay holds the card; the owner confirms before anything is charged.
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { Loader2, ShoppingBag, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton, type IconButtonSize } from '../ui/IconButton';
import { defaultCode } from '../shared/worker/geometryEngine';
import { useCode } from './context/CodeContext';
import { formatDollars, requestEstimate, requestPayUrl, type OrderEstimate } from './orderApi';

const ICON = { className: 'size-4', strokeWidth: 1.75 } as const;

type Phase = 'idle' | 'asking' | 'ready' | 'error';

/** The project slug when Studio shows a saved project at /p/<slug>. */
function currentSlug(): string | undefined {
    const match = /^\/p\/([^/]+)/.exec(window.location.pathname);
    return match ? decodeURIComponent(match[1]) : undefined;
}

function wantsAutoOrder(): boolean {
    return new URLSearchParams(window.location.search).get('order') === '1';
}

/** Open the tab inside the click so popup blockers allow it, then point it at checkout. */
async function payInNewTab(requestId: string): Promise<void> {
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try {
        const url = await requestPayUrl(requestId);
        if (tab) tab.location.href = url;
        else window.location.assign(url);
    } catch (err) {
        tab?.close();
        throw err;
    }
}

function useOrderFlow(code: string) {
    const [open, setOpen] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [estimate, setEstimate] = useState<OrderEstimate | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [paying, setPaying] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const close = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setOpen(false);
        setPhase('idle');
    }, []);

    useEffect(() => () => abortRef.current?.abort(), []);

    const start = useCallback(() => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setOpen(true);
        setPhase('asking');
        setEstimate(null);
        setError(null);
        requestEstimate(code, currentSlug(), controller.signal)
            .then((result) => { setEstimate(result); setPhase('ready'); })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return;
                setError(err instanceof Error ? err.message : 'Ordering did not work just now.');
                setPhase('error');
            });
    }, [code]);

    const pay = useCallback(() => {
        if (!estimate) return;
        setPaying(true);
        setError(null);
        payInNewTab(estimate.requestId)
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Payment did not start.'))
            .finally(() => setPaying(false));
    }, [estimate]);

    return { open, phase, estimate, error, paying, start, close, pay };
}

/** `?order=1` opens the popover and asks once, as soon as the part's code is loaded. */
function useAutoOrder(code: string, start: () => void): void {
    const done = useRef(false);
    useEffect(() => {
        if (done.current || !wantsAutoOrder()) return;
        if (currentSlug() && code === defaultCode) return;
        done.current = true;
        start();
    }, [code, start]);
}

function OrderPopover({ flow }: { flow: ReturnType<typeof useOrderFlow> }): JSX.Element {
    const { phase, estimate, error, paying, close, pay, start } = flow;
    return (
        <div
            data-testid="viewer-order"
            role="dialog"
            aria-label="Order this part"
            className="absolute left-1/2 top-full z-[1002] mt-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-panel border border-border bg-surface-1 p-3 text-left text-ui text-fg shadow-e2"
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">Order this part</span>
                <IconButton label="Close" icon={<X {...ICON} />} size="sm" onClick={close} />
            </div>
            {phase === 'asking' && (
                <p className="flex items-center gap-2 text-fg-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Asking makers… (about a minute)
                </p>
            )}
            {phase === 'ready' && estimate && (
                <p data-testid="order-summary">{estimate.summary}</p>
            )}
            {error && <p role="alert" className="mt-1 text-danger">{error}</p>}
            {phase === 'ready' && estimate && (
                <Button variant="primary" size="sm" className="mt-3 w-full" disabled={paying} onClick={pay}>
                    {`Pay ${formatDollars(estimate.cents)}`}
                </Button>
            )}
            {phase === 'error' && (
                <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={start}>Try again</Button>
            )}
        </div>
    );
}

export function OrderButton({ size = 'sm' }: { size?: IconButtonSize }): JSX.Element {
    const { code } = useCode();
    const flow = useOrderFlow(code);
    const { open, phase, start, close } = flow;
    useAutoOrder(code, start);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
        const onPointer = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerdown', onPointer);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerdown', onPointer);
        };
    }, [open, close]);

    return (
        <div ref={rootRef} className="relative">
            <IconButton
                label="Order"
                description="Get a price and order this part"
                icon={phase === 'asking' ? <Loader2 {...ICON} className="size-4 animate-spin" /> : <ShoppingBag {...ICON} />}
                size={size}
                tooltipSide="bottom"
                pressed={open}
                onClick={open ? close : start}
                data-testid="toolbar-order"
            />
            {open && <OrderPopover flow={flow} />}
        </div>
    );
}
