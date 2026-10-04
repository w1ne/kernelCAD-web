// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { cx } from './cx';

export interface SkeletonProps {
    readonly className?: string;
}

/** A shimmer block. Decorative: wrap groups in a status region (see below). */
export function Skeleton({ className }: SkeletonProps): JSX.Element {
    return (
        <div
            aria-hidden="true"
            data-skeleton=""
            className={cx(
                'animate-shimmer rounded-control bg-surface-2 bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--kc-surface-2)_25%,var(--kc-surface-3)_50%,var(--kc-surface-2)_75%)]',
                className,
            )}
        />
    );
}

interface LoadingGroupProps {
    /** Screen-reader text for the loading region. */
    readonly label?: string;
    readonly className?: string;
}

/** Lines of text placeholder; the last line is shorter. */
export function SkeletonText({ lines = 3, label = 'Loading', className }: LoadingGroupProps & { readonly lines?: number }): JSX.Element {
    return (
        <div role="status" aria-label={label} className={cx('flex flex-col gap-2', className)}>
            {Array.from({ length: lines }, (_, i) => (
                <Skeleton key={i} className={cx('h-3', i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')} />
            ))}
        </div>
    );
}

/** A 4:3 card placeholder: image, title and meta line. */
export function SkeletonCard({ label = 'Loading', className }: LoadingGroupProps): JSX.Element {
    return (
        <div
            role="status"
            aria-label={label}
            className={cx('overflow-hidden rounded-panel border border-border bg-surface-1', className)}
        >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-3">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-2/5" />
            </div>
        </div>
    );
}

/** Rows placeholder for lists (feature tree, projects). */
export function SkeletonList({ rows = 4, label = 'Loading', className }: LoadingGroupProps & { readonly rows?: number }): JSX.Element {
    return (
        <div role="status" aria-label={label} className={cx('flex flex-col gap-3', className)}>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 shrink-0" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-2.5 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}
