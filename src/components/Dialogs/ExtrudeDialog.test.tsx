// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ExtrudeDialog } from './ExtrudeDialog';
import { useWorkbench } from '../../context/WorkbenchContext';

// Mock useWorkbench
vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: vi.fn(),
}));

afterEach(() => {
    cleanup();
});

describe('ExtrudeDialog', () => {
    const mockSketches = [
        { id: 's1', name: 'sketch1', plane: 'XY' },
        { id: 's2', name: 'sketch2', plane: 'XZ' },
    ];

    beforeEach(() => {
        (useWorkbench as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
            sketches: mockSketches,
        });
    });

    it('should render sketch options', () => {
        render(<ExtrudeDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);

        expect(screen.getByText('sketch1 (XY Plane)')).toBeDefined();
        expect(screen.getByText('sketch2 (XZ Plane)')).toBeDefined();
    });

    it('should call onConfirm with selected sketch and distance', () => {
        const onConfirm = vi.fn();
        render(<ExtrudeDialog onConfirm={onConfirm} onCancel={vi.fn()} />);

        const distanceInput = screen.getByLabelText(/Distance/i);
        fireEvent.change(distanceInput, { target: { value: '25' } });

        const submitButton = screen.getByRole('button', { name: 'Extrude' });
        fireEvent.click(submitButton);

        expect(onConfirm).toHaveBeenCalledWith({
            sketchName: 'sketch2', // default select last sketch in my implementation
            distance: 25,
            direction: 'normal',
        });
    });

    it('should call onCancel when cancel button clicked', () => {
        const onCancel = vi.fn();
        render(<ExtrudeDialog onConfirm={vi.fn()} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
