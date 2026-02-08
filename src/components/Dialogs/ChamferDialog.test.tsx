/**
 * @vitest-environment happy-dom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChamferDialog } from './ChamferDialog';

describe('ChamferDialog', () => {
    afterEach(cleanup);

    it('renders correctly', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<ChamferDialog onConfirm={onConfirm} onCancel={onCancel} />);

        expect(screen.getByText('Chamfer Edges')).toBeDefined();
    });

    it('submits correct values', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<ChamferDialog onConfirm={onConfirm} onCancel={onCancel} />);

        // Use getElementById since happy-dom has issues with getByLabelText
        const targetNameInput = document.getElementById('field-targetName') as HTMLInputElement;
        const distanceInput = document.getElementById('field-distance') as HTMLInputElement;
        const filterSelect = document.getElementById('field-filterType') as HTMLSelectElement;

        fireEvent.change(targetNameInput, { target: { value: 'part2' } });
        fireEvent.change(distanceInput, { target: { value: '2' } });
        fireEvent.change(filterSelect, { target: { value: 'horizontal' } });

        const form = screen.getByRole('button', { name: 'Apply Chamfer' }).closest('form')!;
        fireEvent.submit(form);

        expect(onConfirm).toHaveBeenCalledWith({
            targetName: 'part2',
            distance: 2,
            filterType: 'horizontal'
        });
    });
});
