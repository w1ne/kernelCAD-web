import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintSolver } from './solver';
import type { SolverState, SketchEntity, Point } from './types';

function asPoint(e: SketchEntity | undefined): Point {
    if (!e || e.type !== 'POINT') {
        throw new Error(`Entity is not a point: ${JSON.stringify(e)}`);
    }
    return e;
}

describe('ConstraintSolver', () => {
    let solver: ConstraintSolver;
    let state: SolverState;

    beforeEach(() => {
        solver = new ConstraintSolver();
        state = {
            entities: new Map<string, SketchEntity>(),
            constraints: []
        };
    });

    it('should solve COINCIDENT constraint', () => {
        state.entities.set('p1', { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: false });
        state.entities.set('p2', { id: 'p2', type: 'POINT', x: 10, y: 10, fixed: false });

        state.constraints.push({
            id: 'c1',
            type: 'COINCIDENT',
            entities: ['p1', 'p2']
        });

        solver.solve(state);

        const p1 = asPoint(state.entities.get('p1'));
        const p2 = asPoint(state.entities.get('p2'));

        // Should meet in the middle (5, 5)
        expect(p1.x).toBeCloseTo(5);
        expect(p1.y).toBeCloseTo(5);
        expect(p2.x).toBeCloseTo(5);
        expect(p2.y).toBeCloseTo(5);
    });

    it('should solve DISTANCE constraint', () => {
        state.entities.set('p1', { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('p2', { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: false });

        state.constraints.push({
            id: 'c1',
            type: 'DISTANCE',
            entities: ['p1', 'p2'],
            value: 20
        });

        solver.solve(state);

        const p2 = asPoint(state.entities.get('p2'));
        // P1 fixed at 0,0. P2 should move to 20,0
        expect(p2.x).toBeCloseTo(20);
        expect(p2.y).toBeCloseTo(0);
    });

    it('should solve HORIZONTAL constraint', () => {
        state.entities.set('p1', { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('p2', { id: 'p2', type: 'POINT', x: 10, y: 5, fixed: false });

        state.constraints.push({
            id: 'c1',
            type: 'HORIZONTAL',
            entities: ['p1', 'p2']
        });

        solver.solve(state);
        const p2 = asPoint(state.entities.get('p2'));
        // P2 should have same Y as P1 (0)
        expect(p2.y).toBeCloseTo(0);
        // X shouldn't change much (solver moves it vertically)
        expect(p2.x).toBeCloseTo(10);
    });
});
