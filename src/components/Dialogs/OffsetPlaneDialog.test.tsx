// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OffsetPlaneDialog } from './OffsetPlaneDialog';
import { useWorkbench } from '../../context/WorkbenchContext';

// Mock useWorkbench
vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: vi.fn(),
}));

afterEach(() => {
    cleanup();
});

describe('OffsetPlaneDialog', () => {
    const mockPlanes = [
        { id: 'base-xy', name: 'Origin XY', type: 'base', visible: true },
        { id: 'plane-123', name: 'Custom Plane', type: 'offset', visible: true },
    ];

    beforeEach(() => {
        (useWorkbench as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
            planes: mockPlanes,
        });
    });

    it('should render plane options', () => {
        render(<OffsetPlaneDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);

        expect(screen.getByText('Origin XY (Origin)')).toBeDefined();
        expect(screen.getByText('Custom Plane')).toBeDefined();
    });

    it('should call onConfirm with selection and offset', () => {
        const onConfirm = vi.fn() as unknown as (data: { basePlaneId: string; offset: number }) => void;
        render(<OffsetPlaneDialog onConfirm={onConfirm} onCancel={vi.fn()} />);

        const offsetInput = screen.getByLabelText(/Offset Distance/i);
        fireEvent.change(offsetInput, { target: { value: '50' } });

        const submitButton = screen.getByRole('button', { name: /Create Plane/i });
        fireEvent.click(submitButton);

        expect(onConfirm).toHaveBeenCalledWith({
            basePlaneId: 'base-xy', // first one by default
            offset: 50,
        });
    });
});
