/**
 * @vitest-environment happy-dom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { FilletDialog } from './FilletDialog';

describe('FilletDialog', () => {
    afterEach(cleanup);

    it('renders correctly', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<FilletDialog onConfirm={onConfirm} onCancel={onCancel} />);

        expect(screen.getByText('Fillet Edges')).toBeDefined();
    });

    it('submits correct values', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<FilletDialog onConfirm={onConfirm} onCancel={onCancel} />);

        const targetNameInput = screen.getByLabelText(/target variable name/i) as HTMLInputElement;
        const radiusInput = screen.getByLabelText(/radius \(mm\)/i) as HTMLInputElement;
        const filterSelect = screen.getByLabelText(/edge filter/i) as HTMLSelectElement;

        fireEvent.change(targetNameInput, { target: { value: 'part1' } });
        fireEvent.change(radiusInput, { target: { value: '5.5' } });
        fireEvent.change(filterSelect, { target: { value: 'vertical' } });

        const form = screen.getByRole('button', { name: /apply fillet/i }).closest('form')!;
        fireEvent.submit(form);

        expect(onConfirm).toHaveBeenCalledWith({
            targetName: 'part1',
            radius: 5.5,
            filterType: 'vertical'
        });
    });
});
