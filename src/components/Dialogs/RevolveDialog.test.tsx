/**
 * @vitest-environment happy-dom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RevolveDialog } from './RevolveDialog';
import { WorkbenchContext, type WorkbenchContextType } from '../../context/WorkbenchContext';

const mockWorkbenchContext = {
    code: '',
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
            <WorkbenchContext.Provider value={mockWorkbenchContext as unknown as WorkbenchContextType}>
                <RevolveDialog onConfirm={onConfirm} onCancel={onCancel} />
            </WorkbenchContext.Provider>
        );

        expect(screen.getByRole('heading', { name: 'Revolve' })).toBeDefined();
        // Check that the form renders with select dropdowns (sketch + axis)
        const selectElements = screen.getAllByRole('combobox');
        expect(selectElements.length).toBeGreaterThan(0);
    });

    it('submits correct values', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        render(
            <WorkbenchContext.Provider value={mockWorkbenchContext as unknown as WorkbenchContextType}>
                <RevolveDialog onConfirm={onConfirm} onCancel={onCancel} />
            </WorkbenchContext.Provider>
        );

        // Use form submission instead of individual field changes
        const form = screen.getByRole('button', { name: 'Revolve' }).closest('form');
        const sketchSelect = form?.querySelector('select[value="sketch2"]') as HTMLSelectElement;
        const angleInput = form?.querySelector('input[type="number"]') as HTMLInputElement;
        const axisSelect = form?.querySelectorAll('select')[1] as HTMLSelectElement;

        if (sketchSelect) fireEvent.change(sketchSelect, { target: { value: 'sketch2' } });
        if (angleInput) fireEvent.change(angleInput, { target: { value: '180' } });
        if (axisSelect) fireEvent.change(axisSelect, { target: { value: 'Y' } });

        fireEvent.click(screen.getByRole('button', { name: 'Revolve' }));

        expect(onConfirm).toHaveBeenCalledWith({
            sketchName: 'sketch2',
            angle: 180,
            axis: 'Y'
        });
    });
});
