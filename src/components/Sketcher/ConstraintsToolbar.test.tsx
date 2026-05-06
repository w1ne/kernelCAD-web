// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConstraintsToolbar } from './ConstraintsToolbar';
import { useWorkbench } from '../../context/WorkbenchContext';
import type { WorkbenchContextType } from '../../context/WorkbenchContext';

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: vi.fn(),
}));

const addConstraint = vi.fn();
const solve = vi.fn();

function mockWorkbench(selectedEntityIds: string[] = ['a', 'b']) {
    (useWorkbench as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
        sketchMode: { active: true },
        selectedEntityIds,
        addConstraint,
        solve,
    } as unknown as WorkbenchContextType);
}

describe('ConstraintsToolbar', () => {
    beforeEach(() => {
        vi.stubGlobal('crypto', { randomUUID: () => 'constraint-id' });
        mockWorkbench();
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('renders every solver-backed constraint action', () => {
        render(<ConstraintsToolbar />);

        [
            'Coincident',
            'Distance',
            'Horizontal',
            'Vertical',
            'Parallel',
            'Perpendicular',
            'Tangent',
            'Radius',
            'Angle',
            'Equal',
            'Concentric',
            'Symmetric',
        ].forEach((title) => {
            expect(screen.getByTitle(title)).toBeDefined();
        });
    });

    it('adds parallel, perpendicular, and tangent constraints from the selected entities', () => {
        mockWorkbench(['lineA', 'lineB']);
        render(<ConstraintsToolbar />);

        fireEvent.click(screen.getByTitle('Parallel'));
        fireEvent.click(screen.getByTitle('Perpendicular'));
        fireEvent.click(screen.getByTitle('Tangent'));

        expect(addConstraint).toHaveBeenNthCalledWith(1, {
            id: 'constraint-id',
            type: 'PARALLEL',
            entities: ['lineA', 'lineB'],
            value: undefined,
        });
        expect(addConstraint).toHaveBeenNthCalledWith(2, {
            id: 'constraint-id',
            type: 'PERPENDICULAR',
            entities: ['lineA', 'lineB'],
            value: undefined,
        });
        expect(addConstraint).toHaveBeenNthCalledWith(3, {
            id: 'constraint-id',
            type: 'TANGENT',
            entities: ['lineA', 'lineB'],
            value: undefined,
        });
        expect(solve).toHaveBeenCalledTimes(3);
    });
});
