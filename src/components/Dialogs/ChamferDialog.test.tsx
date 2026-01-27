/**
 * @vitest-environment jsdom
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

        fireEvent.change(screen.getByLabelText('Target Variable Name'), { target: { value: 'part2' } });
        fireEvent.change(screen.getByLabelText('Distance (mm)'), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText('Edge Filter'), { target: { value: 'horizontal' } });

        fireEvent.click(screen.getByRole('button', { name: 'Apply Chamfer' }));

        expect(onConfirm).toHaveBeenCalledWith({
            targetName: 'part2',
            distance: 2,
            filterType: 'horizontal'
        });
    });
});
