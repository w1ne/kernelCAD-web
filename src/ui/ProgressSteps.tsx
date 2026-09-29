// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, ReactNode } from 'react';
import { Check, Circle, CircleAlert, Loader2, Minus, X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { formatElapsed } from './progressModel';

export type StepStatus = 'done' | 'current' | 'pending' | 'failed' | 'skipped';

export interface ProgressStep {
    readonly id: string;
    readonly label: string;
    readonly status: StepStatus;
    /** One short line under the label: "attempt 2", "3 tool calls". */
    readonly detail?: string;
}

export interface ProgressStepsProps {
    /** "Building", "Exporting", "Stopped". */
    readonly title: string;
    readonly steps: readonly ProgressStep[];
    /** Wall time of the run; shown as m:ss next to the title. */
    readonly elapsedMs?: number;
    /** Shows a stop button in the header while the run can be stopped. */
    readonly onCancel?: () => void;
    readonly cancelLabel?: string;
    /** Announce step changes politely (the run is live). */
    readonly live?: boolean;
    /** Footer slot, e.g. a "Show log" disclosure. */
    readonly children?: ReactNode;
    readonly className?: string;
    readonly 'data-testid'?: string;
}

const ICON = { className: 'size-4', strokeWidth: 1.75, 'aria-hidden': true } as const;

function StepIcon({ status }: { status: StepStatus }): JSX.Element {
    switch (status) {
        case 'done':
            return <Check {...ICON} className="size-4 text-ok" />;
        case 'current':
            return <Loader2 {...ICON} className="size-4 animate-spin text-agent motion-reduce:animate-none" />;
        case 'failed':
            return <CircleAlert {...ICON} className="size-4 text-danger" />;
        case 'skipped':
            return <Minus {...ICON} className="size-4 text-fg-3" />;
        default:
            return <Circle {...ICON} className="size-4 text-fg-3" />;
    }
}

const STATUS_TEXT: Record<StepStatus, string> = {
    done: 'done',
    current: 'in progress',
    pending: 'not started',
    failed: 'failed',
    skipped: 'skipped',
};

const LABEL_CLASS: Record<StepStatus, string> = {
    done: 'text-fg-2',
    // 1.5 s copper shimmer across the current step (none with reduced motion).
    current:
        'font-medium text-fg bg-[linear-gradient(90deg,var(--kc-fg)_0%,var(--kc-fg)_35%,var(--kc-agent)_50%,var(--kc-fg)_65%,var(--kc-fg)_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer',
    pending: 'text-fg-3',
    failed: 'font-medium text-danger',
    skipped: 'text-fg-3 line-through decoration-fg-3/60',
};

/**
 * The step list for agent runs and exports: done / current (shimmer) /
 * pending, plus failed and skipped for honest endings. The header carries
 * the elapsed time and an optional stop button.
 */
export function ProgressSteps({
    title,
    steps,
    elapsedMs,
    onCancel,
    cancelLabel = 'Stop',
    live = false,
    children,
    className,
    'data-testid': testId,
}: ProgressStepsProps): JSX.Element {
    return (
        <section
            aria-label={title}
            data-testid={testId}
            className={cx('rounded-panel border border-border bg-surface-1', className)}
        >
            <header className="flex items-center gap-2 border-b border-border py-1.5 pl-3 pr-1.5">
                <h3 className="min-w-0 flex-1 truncate text-ui font-medium text-fg">{title}</h3>
                {elapsedMs !== undefined && (
                    <span className="font-mono text-code tabular-nums text-fg-3" aria-label={`Elapsed ${formatElapsed(elapsedMs)}`}>
                        {formatElapsed(elapsedMs)}
                    </span>
                )}
                {onCancel && (
                    <IconButton
                        label={cancelLabel}
                        icon={<X className="size-4" strokeWidth={1.75} />}
                        size="sm"
                        onClick={onCancel}
                        className="hover:text-danger max-md:size-touch"
                    />
                )}
            </header>
            <ol className="flex flex-col gap-1.5 px-3 py-2.5" aria-live={live ? 'polite' : undefined}>
                {steps.map((step) => (
                    <li key={step.id} className="flex gap-2" data-status={step.status} aria-current={step.status === 'current' ? 'step' : undefined}>
                        <span className="mt-px inline-flex shrink-0">
                            <StepIcon status={step.status} />
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span className={cx('text-ui', LABEL_CLASS[step.status])}>
                                {step.label}
                                <span className="sr-only">, {STATUS_TEXT[step.status]}</span>
                            </span>
                            {step.detail && <span className="text-2xs text-fg-3">{step.detail}</span>}
                        </span>
                    </li>
                ))}
            </ol>
            {children && <div className="border-t border-border">{children}</div>}
        </section>
    );
}
