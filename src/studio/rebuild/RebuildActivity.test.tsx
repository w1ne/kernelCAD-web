// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RebuildActivity, RebuildActivityView, useRebuildSnapshot } from './RebuildActivity';
import type { RebuildJobView, RebuildSnapshot } from './rebuildQueue';

afterEach(() => {
    cleanup();
});

/** A queue that only the test drives. */
interface FakeQueue {
    subscribe(listener: () => void): () => void;
    getSnapshot(): RebuildSnapshot;
    publish(next: RebuildSnapshot): void;
    clearError?: () => void;
}

function createFakeQueue(initial: RebuildSnapshot): FakeQueue {
    let current = initial;
    const listeners = new Set<() => void>();
    return {
        subscribe(listener: () => void): () => void {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        getSnapshot(): RebuildSnapshot {
            return current;
        },
        publish(next: RebuildSnapshot): void {
            current = next;
            for (const listener of [...listeners]) listener();
        },
    };
}

function job(overrides: Partial<RebuildJobView> & { id: number; label: string }): RebuildJobView {
    return {
        doc: 'studio-model',
        state: 'queued',
        queuedAt: 0,
        startedAt: null,
        ...overrides,
    };
}

function snapshot(jobs: RebuildJobView[], lastError: RebuildSnapshot['lastError'] = null): RebuildSnapshot {
    return { jobs, lastError };
}

describe('RebuildActivityView', () => {
    it('renders nothing while the queue is idle', () => {
        const { container } = render(<RebuildActivityView snapshot={snapshot([])} now={1_000} />);
        expect(container.firstChild).toBeNull();
    });

    it('shows the running and the queued job with their state', () => {
        const now = 10_000;
        const jobs = [
            job({ id: 1, label: 'Mesh rebuild', state: 'running', queuedAt: 8_000, startedAt: 8_800 }),
            job({ id: 2, label: 'Kernel rebuild', state: 'queued', queuedAt: 9_500 }),
        ];

        render(<RebuildActivityView snapshot={snapshot(jobs)} now={now} />);

        expect(screen.getByText('Mesh rebuild')).toBeTruthy();
        expect(screen.getByText('Kernel rebuild')).toBeTruthy();
        expect(screen.getByText('Rebuilding (2)')).toBeTruthy();

        const runningRow = screen.getByText('Mesh rebuild').closest('[data-testid="rebuild-job"]');
        expect(runningRow?.getAttribute('data-state')).toBe('running');
        expect(runningRow?.textContent).toContain(`${((now - 8_800) / 1000).toFixed(1)} s`);

        const queuedRow = screen.getByText('Kernel rebuild').closest('[data-testid="rebuild-job"]');
        expect(queuedRow?.getAttribute('data-state')).toBe('queued');
        expect(queuedRow?.textContent).toContain('queued');
    });

    it('counts the jobs that do not fit into the list', () => {
        const jobs = Array.from({ length: 7 }, (_, index) => job({ id: index + 1, label: `Job ${index + 1}` }));

        render(<RebuildActivityView snapshot={snapshot(jobs)} now={1_000} />);

        expect(screen.getAllByTestId('rebuild-job')).toHaveLength(4);
        expect(screen.getByText(`+${jobs.length - 4} more`)).toBeTruthy();
    });

    it('shows the last error and lets the user dismiss it', () => {
        const onDismissError = vi.fn();

        render(
            <RebuildActivityView
                snapshot={snapshot([], { label: 'Mesh rebuild', message: 'The server said no', at: 1 })}
                now={1_000}
                onDismissError={onDismissError}
            />,
        );

        const error = screen.getByTestId('rebuild-error');
        expect(error.textContent).toContain('The server said no');
        expect(screen.getByTitle('The server said no')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Dismiss rebuild error'));
        expect(onDismissError).toHaveBeenCalledTimes(1);
    });
});

describe('useRebuildSnapshot', () => {
    it('re-renders when the queue publishes a new snapshot', () => {
        const queue = createFakeQueue(snapshot([job({ id: 1, label: 'Mesh rebuild' })]));

        function Probe() {
            const live = useRebuildSnapshot(queue);
            return <span data-testid="probe">{live.jobs.length}</span>;
        }

        render(<Probe />);
        expect(screen.getByTestId('probe').textContent).toBe('1');

        act(() => {
            queue.publish(snapshot([
                job({ id: 1, label: 'Mesh rebuild' }),
                job({ id: 2, label: 'Kernel rebuild' }),
            ]));
        });

        expect(screen.getByTestId('probe').textContent).toBe('2');
    });
});

describe('RebuildActivity', () => {
    it('follows the queue and dismisses the error through it', () => {
        const queue = createFakeQueue(snapshot([
            job({ id: 1, label: 'Mesh rebuild', state: 'running', startedAt: Date.now() - 1_200 }),
        ]));
        const clearError = vi.fn();
        queue.clearError = clearError;

        render(<RebuildActivity queue={queue} />);
        expect(screen.getByText('Mesh rebuild')).toBeTruthy();

        act(() => {
            queue.publish(snapshot([], { label: 'Mesh rebuild', message: 'The server said no', at: 1 }));
        });
        expect(screen.getByTestId('rebuild-error').textContent).toContain('The server said no');

        fireEvent.click(screen.getByLabelText('Dismiss rebuild error'));
        expect(clearError).toHaveBeenCalledTimes(1);
    });
});
