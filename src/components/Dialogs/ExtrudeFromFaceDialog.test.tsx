// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ExtrudeFromFaceDialog } from './ExtrudeFromFaceDialog';

afterEach(() => {
    cleanup();
});

describe('ExtrudeFromFaceDialog', () => {
    it('should submit distance', () => {
        const onConfirm = vi.fn();
        render(<ExtrudeFromFaceDialog onConfirm={onConfirm} onCancel={vi.fn()} />);

        const input = screen.getByLabelText(/Distance/i);
        fireEvent.change(input, { target: { value: '50' } });

        fireEvent.click(screen.getByRole('button', { name: 'Extrude' }));

        expect(onConfirm).toHaveBeenCalledWith(50);
    });

    it('should call onCancel', () => {
        const onCancel = vi.fn();
        render(<ExtrudeFromFaceDialog onConfirm={vi.fn()} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onCancel).toHaveBeenCalled();
    });
});
