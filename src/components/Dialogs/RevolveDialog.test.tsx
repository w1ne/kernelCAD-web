/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RevolveDialog } from './RevolveDialog';
import { WorkbenchContext } from '../../context/WorkbenchContext';

const mockWorkbenchContext = {
    sketches: [
        { id: '1', name: 'sketch1', plane: 'XY' },
        { id: '2', name: 'sketch2', plane: 'XZ' }
    ],
    setActiveDialog: vi.fn(),
    insertCode: vi.fn(),
};

describe('RevolveDialog', () => {
    afterEach(cleanup);

    it('renders correctly with sketches', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        render(
            <WorkbenchContext.Provider value={mockWorkbenchContext as any}>
                <RevolveDialog onConfirm={onConfirm} onCancel={onCancel} />
            </WorkbenchContext.Provider>
        );

        expect(screen.getByRole('heading', { name: 'Revolve' })).toBeDefined();
        expect(screen.getByLabelText('Select Sketch Profile')).toBeDefined();
        expect(screen.getByText('sketch1 (XY Plane)')).toBeDefined();
        expect(screen.getByText('sketch2 (XZ Plane)')).toBeDefined();
    });

    it('submits correct values', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        render(
            <WorkbenchContext.Provider value={mockWorkbenchContext as any}>
                <RevolveDialog onConfirm={onConfirm} onCancel={onCancel} />
            </WorkbenchContext.Provider>
        );

        fireEvent.change(screen.getByLabelText('Select Sketch Profile'), { target: { value: 'sketch2' } });
        fireEvent.change(screen.getByLabelText('Angle (degrees)'), { target: { value: '180' } });
        fireEvent.change(screen.getByLabelText('Rotation Axis (local)'), { target: { value: 'Y' } });

        fireEvent.click(screen.getByRole('button', { name: 'Revolve' }));

        expect(onConfirm).toHaveBeenCalledWith({
            sketchName: 'sketch2',
            angle: 180,
            axis: 'Y'
        });
    });
});
