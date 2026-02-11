/**
 * @vitest-environment happy-dom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BooleanDialog } from './BooleanDialog';

describe('BooleanDialog', () => {
    afterEach(cleanup);

    it('renders for union type', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<BooleanDialog type="fuse" onConfirm={onConfirm} onCancel={onCancel} />);

        expect(screen.getByText('Join (Union)')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Join' })).toBeDefined();
    });

    it('renders for cut type', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<BooleanDialog type="cut" onConfirm={onConfirm} onCancel={onCancel} />);

        expect(screen.getByText('Cut (Subtract)')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Cut' })).toBeDefined();
    });

    it('calls onConfirm with correct values', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<BooleanDialog type="fuse" onConfirm={onConfirm} onCancel={onCancel} />);

        const baseInput = screen.getByLabelText(/base shape/i) as HTMLInputElement;
        const toolInput = screen.getByLabelText(/tool shape/i) as HTMLInputElement;

        fireEvent.change(baseInput, { target: { value: 'myBox' } });
        fireEvent.change(toolInput, { target: { value: 'myCyl' } });

        const form = screen.getByRole('button', { name: 'Join' }).closest('form')!;
        fireEvent.submit(form);

        expect(onConfirm).toHaveBeenCalledWith({
            baseName: 'myBox',
            toolName: 'myCyl',
            type: 'fuse'
        });
    });

    it('calls onCancel when cancel button is clicked', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<BooleanDialog type="fuse" onConfirm={onConfirm} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancel).toHaveBeenCalled();
    });
});
