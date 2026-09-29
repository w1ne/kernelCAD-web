// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { ToastContext, type ToastApi } from './toastContext';
import { dropToast, pushToast, toastDuration, type ToastInput, type ToastItem } from './toastModel';

const ICON = {
    success: <CheckCircle2 className="size-4 text-ok" strokeWidth={1.75} />,
    info: <Info className="size-4 text-accent" strokeWidth={1.75} />,
    error: <AlertCircle className="size-4 text-danger" strokeWidth={1.75} />,
} as const;

/** Holds the toast queue and renders it bottom-centre, max 480 px wide. */
export function ToastProvider({ children }: { readonly children?: ReactNode }): JSX.Element {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(1);
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    const dismiss = useCallback((id: number) => {
        const t = timers.current.get(id);
        if (t) clearTimeout(t);
        timers.current.delete(id);
        setToasts((list) => dropToast(list, id));
    }, []);

    const show = useCallback(
        (input: ToastInput) => {
            const id = nextId.current++;
            const tone = input.tone ?? 'info';
            setToasts((list) => pushToast(list, { ...input, id, tone }));
            const ms = toastDuration(tone);
            if (ms !== null) timers.current.set(id, setTimeout(() => dismiss(id), ms));
            return id;
        },
        [dismiss],
    );

    useEffect(() => {
        const map = timers.current;
        return () => map.forEach((t) => clearTimeout(t));
    }, []);

    const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);
    const polite = toasts.filter((t) => t.tone !== 'error');
    const errors = toasts.filter((t) => t.tone === 'error');

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1000] flex flex-col items-center gap-2 px-4">
                <div role="status" aria-live="polite" className="flex w-full max-w-[480px] flex-col gap-2">
                    {polite.map((t) => (
                        <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
                    ))}
                </div>
                <div role="alert" aria-live="assertive" className="flex w-full max-w-[480px] flex-col gap-2">
                    {errors.map((t) => (
                        <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
}

function ToastCard({ toast, onDismiss }: { readonly toast: ToastItem; readonly onDismiss: (id: number) => void }): JSX.Element {
    return (
        <div
            data-tone={toast.tone}
            className={cx(
                'pointer-events-auto flex animate-pop-in items-start gap-3 rounded-panel border bg-surface-1 py-2.5 pl-3 pr-1.5 text-fg shadow-e2',
                toast.tone === 'error' ? 'border-danger' : 'border-border',
            )}
        >
            <span aria-hidden="true" className="mt-0.5 inline-flex">
                {ICON[toast.tone]}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-ui font-medium">{toast.title}</p>
                {toast.description && <p className="text-ui text-fg-2">{toast.description}</p>}
            </div>
            {toast.action && (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                        toast.action?.onClick();
                        onDismiss(toast.id);
                    }}
                >
                    {toast.action.label}
                </Button>
            )}
            <IconButton size="sm" label="Dismiss" icon={<X className="size-3.5" strokeWidth={1.75} />} onClick={() => onDismiss(toast.id)} />
        </div>
    );
}
