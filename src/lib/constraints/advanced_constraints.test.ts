
import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintSolver } from './solver';
import type { SolverState, SketchEntity, Point } from './types';

function asPoint(e: SketchEntity | undefined): Point {
    if (!e || e.type !== 'POINT') {
        throw new Error(`Entity is not a point: ${JSON.stringify(e)}`);
    }
    return e;
}

describe('Advanced Constraints', () => {
    let solver: ConstraintSolver;
    let state: SolverState;

    beforeEach(() => {
        solver = new ConstraintSolver();
        state = {
            entities: new Map<string, SketchEntity>(),
            constraints: []
        };
    });

    it('should solve PARALLEL constraint', () => {
        // Line 1: horizontal (0,0) -> (10,0)
        state.entities.set('p1', { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('p2', { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: true });
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'p1', p2: 'p2' });

        // Line 2: 45 degrees (0,10) -> (10, 20)
        state.entities.set('p3', { id: 'p3', type: 'POINT', x: 0, y: 10, fixed: true }); // Pivot
        state.entities.set('p4', { id: 'p4', type: 'POINT', x: 10, y: 20, fixed: false });
        state.entities.set('l2', { id: 'l2', type: 'LINE', p1: 'p3', p2: 'p4' });

        state.constraints.push({
            id: 'c1',
            type: 'PARALLEL',
            entities: ['l1', 'l2']
        });

        solver.solve(state);

        const p4 = asPoint(state.entities.get('p4'));
        // P4 should move so L2 is horizontal.
        // P3 is (0,10). P4 started at (10,20).
        // If horizontal, P4 should be at (something, 10).
        // Since P3 is fixed, P4 moves.
        expect(p4.y).toBeCloseTo(10, 1);
    });

    it('should solve PERPENDICULAR constraint', () => {
        // Line 1: horizontal (0,0) -> (10,0)
        state.entities.set('p1', { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('p2', { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: true });
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'p1', p2: 'p2' });

        // Line 2: parallel to L1 initially (0,10) -> (10,10)
        state.entities.set('p3', { id: 'p3', type: 'POINT', x: 0, y: 10, fixed: true });
        state.entities.set('p4', { id: 'p4', type: 'POINT', x: 10, y: 10, fixed: false });
        state.entities.set('l2', { id: 'l2', type: 'LINE', p1: 'p3', p2: 'p4' });

        state.constraints.push({
            id: 'c1',
            type: 'PERPENDICULAR',
            entities: ['l1', 'l2']
        });

        solver.solve(state);

        const p4 = asPoint(state.entities.get('p4'));
        // L2 should become vertical.
        // P3 is (0,10). P4 should be at (0, something).
        expect(p4.x).toBeCloseTo(0, 1);
    });

    it('should solve TANGENT constraint (Line-Circle)', () => {
        // Circle at (0,0) radius 10
        state.entities.set('cp', { id: 'cp', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('c1', { id: 'c1', type: 'CIRCLE', center: 'cp', radius: 10 });

        // Line horizontal at y=20
        state.entities.set('p1', { id: 'p1', type: 'POINT', x: -10, y: 20, fixed: false });
        state.entities.set('p2', { id: 'p2', type: 'POINT', x: 10, y: 20, fixed: false });
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'p1', p2: 'p2' });

        state.constraints.push({
            id: 't1',
            type: 'TANGENT',
            entities: ['c1', 'l1']
        });

        solver.solve(state);

        const p1 = asPoint(state.entities.get('p1'));
        const p2 = asPoint(state.entities.get('p2'));

        // Line should move down to y=10 (or -10), closest is 10.
        expect(p1.y).toBeCloseTo(10, 1);
        expect(p2.y).toBeCloseTo(10, 1);
    });
});
