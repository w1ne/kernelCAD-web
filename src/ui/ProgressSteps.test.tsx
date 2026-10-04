// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatElapsed } from './progressModel';
import { ProgressSteps } from './ProgressSteps';

afterEach(() => cleanup());

const STEPS = [
    { id: 'a', label: 'Plan', status: 'done' as const },
    { id: 'b', label: 'Build', status: 'current' as const, detail: 'attempt 2' },
    { id: 'c', label: 'Verify', status: 'pending' as const },
];

describe('formatElapsed', () => {
    it('formats m:ss', () => {
        expect(formatElapsed(0)).toBe('0:00');
        expect(formatElapsed(7_900)).toBe('0:07');
        expect(formatElapsed(102_000)).toBe('1:42');
        expect(formatElapsed(-5)).toBe('0:00');
    });
});

describe('ProgressSteps', () => {
    it('lists the steps with their state for screen readers and marks the current one', () => {
        render(<ProgressSteps title="Building" steps={STEPS} elapsedMs={24_000} live />);
        const items = screen.getAllByRole('listitem');
        expect(items.map((li) => li.getAttribute('data-status'))).toEqual(['done', 'current', 'pending']);
        expect(items[1]).toHaveAttribute('aria-current', 'step');
        expect(items[0]).toHaveTextContent('Plan, done');
        expect(items[1]).toHaveTextContent('attempt 2');
        expect(screen.getByRole('list')).toHaveAttribute('aria-live', 'polite');
        expect(screen.getByLabelText('Elapsed 0:24')).toHaveTextContent('0:24');
    });

    it('shows a stop button only when the run can be stopped', () => {
        const onCancel = vi.fn();
        const { rerender } = render(<ProgressSteps title="Building" steps={STEPS} onCancel={onCancel} cancelLabel="Stop the run" />);
        fireEvent.click(screen.getByRole('button', { name: 'Stop the run' }));
        expect(onCancel).toHaveBeenCalledOnce();
        rerender(<ProgressSteps title="Stopped" steps={STEPS} />);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders a footer slot', () => {
        render(<ProgressSteps title="Building" steps={STEPS}><button type="button">Show log</button></ProgressSteps>);
        expect(screen.getByRole('button', { name: 'Show log' })).toBeInTheDocument();
    });
});
