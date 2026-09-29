// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'agent';

export interface BadgeProps {
    readonly tone?: BadgeTone;
    /** A leading dot in the tone colour (e.g. "● Live"). */
    readonly dot?: boolean;
    readonly icon?: ReactNode;
    readonly className?: string;
    readonly children: ReactNode;
}

const TONE: Record<BadgeTone, string> = {
    neutral: 'bg-surface-2 text-fg-2 border border-border',
    accent: 'bg-accent-soft text-accent',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    agent: 'bg-agent-soft text-agent-fg',
};

/** Small status label: "Verified", "Live", "Public by link", "Staged". */
export function Badge({ tone = 'neutral', dot, icon, className, children }: BadgeProps): JSX.Element {
    return (
        <span
            data-tone={tone}
            className={cx(
                'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 font-sans text-2xs font-medium',
                TONE[tone],
                className,
            )}
        >
            {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
            {icon && (
                <span aria-hidden="true" className="inline-flex [&>svg]:size-3">
                    {icon}
                </span>
            )}
            {children}
        </span>
    );
}
