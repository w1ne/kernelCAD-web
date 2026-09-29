// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, type JSX, type ReactNode } from 'react';
import { AlertTriangle, Check, Copy, RotateCw } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';

export interface ErrorStateProps {
    /** What happened, in plain words. */
    readonly title: string;
    /** What the user can do next. */
    readonly description?: ReactNode;
    /** Shows a primary "Try again" button. */
    readonly onRetry?: () => void;
    readonly retryLabel?: string;
    readonly retrying?: boolean;
    /** A way out: a link home, to the gallery, etc. */
    readonly secondaryAction?: ReactNode;
    /** An id the user can copy into a bug report. */
    readonly errorId?: string;
    readonly className?: string;
}

/**
 * An error the user can act on: what happened, what to do, a retry, a
 * way out and an error id to copy. Never a bare "Loading…" that never ends.
 */
export function ErrorState({
    title,
    description,
    onRetry,
    retryLabel = 'Try again',
    retrying,
    secondaryAction,
    errorId,
    className,
}: ErrorStateProps): JSX.Element {
    const [copied, setCopied] = useState(false);
    const copy = async (): Promise<void> => {
        if (!errorId) return;
        try {
            await navigator.clipboard.writeText(errorId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div role="alert" className={cx('mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center', className)}>
            <div aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangle className="size-6" strokeWidth={1.75} />
            </div>
            <h3 className="text-title text-fg">{title}</h3>
            {description && <p className="text-ui text-fg-2">{description}</p>}
            {(onRetry || secondaryAction) && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                    {onRetry && (
                        <Button
                            variant="primary"
                            onClick={onRetry}
                            loading={retrying}
                            leadingIcon={<RotateCw className="size-4" strokeWidth={1.75} aria-hidden="true" />}
                        >
                            {retryLabel}
                        </Button>
                    )}
                    {secondaryAction}
                </div>
            )}
            {errorId && (
                <button
                    type="button"
                    onClick={copy}
                    className="focus-ring mt-1 inline-flex items-center gap-1.5 rounded-control px-1.5 py-0.5 font-mono text-code text-fg-3 hover:text-fg"
                    aria-label={copied ? 'Error id copied' : `Copy error id ${errorId}`}
                >
                    <span>Error id: {errorId}</span>
                    {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                </button>
            )}
        </div>
    );
}
