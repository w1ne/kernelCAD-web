// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/rebuild/RebuildActivity.tsx
//
// A small overlay for the 3D viewport: the rebuilds that run or wait, so the
// user sees the work while the viewer stays interactive. The overlay never
// takes the pointer - only the button that dismisses an error does.

import { useCallback, useEffect, useState, useSyncExternalStore, type JSX } from 'react';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import type { RebuildQueue, RebuildSnapshot } from './rebuildQueue';
import { rebuildQueue } from './rebuildQueueInstance';

/** The job rows the overlay shows before it only counts the rest. */
const MAX_ROWS = 4;
/** How often the elapsed times refresh while a rebuild runs. */
const TICK_MS = 500;

/** The queue parts the overlay needs to read the live state. */
type QueueLike = Pick<RebuildQueue, 'subscribe' | 'getSnapshot'>;

/** The queue parts the connected overlay uses (the error can be dismissed). */
type ConnectedQueueLike = QueueLike & { clearError?: () => void };

interface RebuildActivityViewProps {
    snapshot: RebuildSnapshot;
    /** The current time in ms (the same clock as job.startedAt / queuedAt). */
    now: number;
    onDismissError?: () => void;
}

interface RebuildActivityProps {
    queue?: ConnectedQueueLike;
}

/** The time a running job took, as seconds with one decimal. */
function formatElapsed(ms: number): string {
    return `${(Math.max(0, ms) / 1000).toFixed(1)} s`;
}

/**
 * Live snapshot of the shared rebuild queue.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRebuildSnapshot(queue: QueueLike = rebuildQueue): RebuildSnapshot {
    const subscribe = useCallback((onChange: () => void) => queue.subscribe(onChange), [queue]);
    const getSnapshot = useCallback(() => queue.getSnapshot(), [queue]);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The current time, refreshed only while a rebuild runs. */
function useNow(active: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, [active]);
    return now;
}

/**
 * The overlay itself: the running and queued rebuilds, and the last error.
 * Pure - `now` is the current time, so the elapsed times stay testable.
 */
export function RebuildActivityView({ snapshot, now, onDismissError }: RebuildActivityViewProps): JSX.Element | null {
    const jobs = snapshot.jobs;
    const error = snapshot.lastError;
    if (jobs.length === 0 && !error) return null;

    const running = jobs.some((job) => job.state === 'running');
    const shown = jobs.slice(0, MAX_ROWS);
    const hidden = jobs.length - shown.length;

    return (
        <div
            data-testid="rebuild-activity"
            role="status"
            aria-live="polite"
            className="pointer-events-none flex w-full max-w-[260px] flex-col gap-1 rounded-md border border-border bg-surface-1/90 px-2 py-1.5 text-[11px] text-fg-2 shadow"
        >
            {jobs.length > 0 && (
                <div className="flex items-center gap-1 font-medium">
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                    <span>{running ? 'Rebuilding' : 'Queued'} ({jobs.length})</span>
                </div>
            )}
            {shown.map((job) => (
                <div
                    key={job.id}
                    data-testid="rebuild-job"
                    data-state={job.state}
                    className="flex items-center justify-between gap-2"
                >
                    <span className="min-w-0 flex-1 truncate" title={job.label}>{job.label}</span>
                    {job.state === 'running' && job.startedAt !== null ? (
                        <span className="shrink-0 font-mono tabular-nums text-fg-3">
                            {formatElapsed(now - job.startedAt)}
                        </span>
                    ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 text-fg-3">
                            <Clock size={10} aria-hidden="true" />
                            queued
                        </span>
                    )}
                </div>
            ))}
            {hidden > 0 && (
                <div data-testid="rebuild-more" className="text-fg-3">+{hidden} more</div>
            )}
            {error && (
                <div data-testid="rebuild-error" className="flex items-center gap-1 text-danger">
                    <AlertTriangle size={12} className="shrink-0" aria-hidden="true" />
                    <span className="shrink-0 font-medium">{error.label}</span>
                    <span className="min-w-0 flex-1 truncate" title={error.message}>{error.message}</span>
                    {onDismissError && (
                        <button
                            type="button"
                            aria-label="Dismiss rebuild error"
                            onClick={onDismissError}
                            className="pointer-events-auto shrink-0 rounded px-1 leading-none text-danger hover:bg-surface-3"
                        >
                            ×
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * The overlay wired to a rebuild queue: it follows the live snapshot and
 * refreshes the elapsed times while a rebuild runs.
 */
export function RebuildActivity({ queue = rebuildQueue }: RebuildActivityProps): JSX.Element | null {
    const snapshot = useRebuildSnapshot(queue);
    const running = snapshot.jobs.some((job) => job.state === 'running');
    const now = useNow(running);
    const dismissError = queue.clearError ? () => { queue.clearError?.(); } : undefined;

    return (
        <RebuildActivityView snapshot={snapshot} now={now} onDismissError={dismissError} />
    );
}
