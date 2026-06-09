/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ViewGizmo } from './ViewGizmo';

afterEach(() => cleanup());

describe('ViewGizmo', () => {
    it('renders Fusion-style axis, plane, and fit controls', () => {
        render(<ViewGizmo onNavigate={vi.fn()} />);

        expect(screen.getByTestId('view-cube')).toBeDefined();
        expect(screen.getByTestId('view-axis-arrows')).toBeDefined();

        for (const label of [
            'View along X axis',
            'View along Y axis',
            'View along Z axis',
            'View XY plane',
            'View XZ plane',
            'View YZ plane',
            'Fit model to view',
        ]) {
            expect(screen.getByRole('button', { name: label })).toBeDefined();
        }
    });

    it('sends the requested view target when a control is clicked', () => {
        const onNavigate = vi.fn();
        render(<ViewGizmo onNavigate={onNavigate} />);

        fireEvent.click(screen.getByRole('button', { name: 'View YZ plane' }));
        fireEvent.click(screen.getByRole('button', { name: 'Fit model to view' }));

        expect(onNavigate).toHaveBeenNthCalledWith(1, 'yz');
        expect(onNavigate).toHaveBeenNthCalledWith(2, 'fit');
    });
});
