// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ParameterDialog, { type DialogField } from './ParameterDialog';


// Manually cleanup after each test
afterEach(() => {
    cleanup();
});

const mockFields: DialogField[] = [
    { label: 'Width', key: 'w', defaultValue: 10 },
    { label: 'Height', key: 'h', defaultValue: 20 },
];

describe('ParameterDialog', () => {
    it('should not render when isOpen is false', () => {
        render(
            <ParameterDialog
                isOpen={false}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
                title="Test Dialog"
                fields={mockFields}
            />
        );
        expect(screen.queryByText('Test Dialog')).toBeNull();
    });

    it('should result with default values on submit', () => {
        const onSubmit = vi.fn();
        render(
            <ParameterDialog
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={onSubmit}
                title="Test Dialog"
                fields={mockFields}
            />
        );

        fireEvent.click(screen.getByText('Insert'));
        expect(onSubmit).toHaveBeenCalledWith({ w: 10, h: 20 });
    });

    it('should update values and submit', () => {
        const onSubmit = vi.fn();
        render(
            <ParameterDialog
                isOpen={true}
                onClose={vi.fn()}
                onSubmit={onSubmit}
                title="Test Dialog"
                fields={mockFields}
            />
        );

        // Change Width to 50
        const input = screen.getByDisplayValue('10'); // Width input
        fireEvent.change(input, { target: { value: '50' } });

        fireEvent.click(screen.getByText('Insert'));
        expect(onSubmit).toHaveBeenCalledWith({ w: 50, h: 20 });
    });

    it('should call onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(
            <ParameterDialog
                isOpen={true}
                onClose={onClose}
                onSubmit={vi.fn()}
                title="Test Dialog"
                fields={mockFields}
            />
        );

        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalled();
    });
});
