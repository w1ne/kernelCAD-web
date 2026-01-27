/**
 * @vitest-environment jsdom
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

        fireEvent.change(screen.getByLabelText('Target Variable Name'), { target: { value: 'part1' } });
        fireEvent.change(screen.getByLabelText('Radius (mm)'), { target: { value: '5.5' } });
        fireEvent.change(screen.getByLabelText('Edge Filter'), { target: { value: 'vertical' } });

        fireEvent.click(screen.getByRole('button', { name: 'Apply Fillet' }));

        expect(onConfirm).toHaveBeenCalledWith({
            targetName: 'part1',
            radius: 5.5,
            filterType: 'vertical'
        });
    });
});
