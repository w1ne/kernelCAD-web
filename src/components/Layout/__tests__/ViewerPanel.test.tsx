
/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ViewerPanel } from '../ViewerPanel';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock Viewer and ConstraintsToolbar
vi.mock('../../Viewer', () => ({
    default: () => <div data-testid="mock-viewer">3D Viewer</div>
}));

vi.mock('../../Sketcher/ConstraintsToolbar', () => ({
    ConstraintsToolbar: () => <div data-testid="mock-constraints">Constraints</div>
}));

describe('ViewerPanel', () => {
    afterEach(() => {
        cleanup();
    });

    const defaultProps = {
        geometries: [],
        sketchesGeometries: [],
        showSketches: true,
        viewMode3D: 'shaded' as any,
        isFaceSelecting: false,
        onCancelFaceSelection: vi.fn()
    };

    it('should render the viewer and constraints toolbar', () => {
        render(<ViewerPanel {...defaultProps} />);
        expect(screen.getByTestId('mock-viewer')).toBeTruthy();
        expect(screen.getByTestId('mock-constraints')).toBeTruthy();
    });

    it('should display face selection overlay when isFaceSelecting is true', () => {
        render(<ViewerPanel {...defaultProps} isFaceSelecting={true} />);
        expect(screen.getByText(/Click a face to start sketching/i)).toBeTruthy();
    });

    it('should call onCancelFaceSelection when cancel button is clicked', () => {
        const onCancel = vi.fn();
        render(<ViewerPanel {...defaultProps} isFaceSelecting={true} onCancelFaceSelection={onCancel} />);
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButton);
        expect(onCancel).toHaveBeenCalled();
    });
});
