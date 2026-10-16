// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintSolver } from './solver';
import type { SolverState, SketchEntity, Point } from './types';
import {
    createRocketConstraintState,
    lineAngleDeg,
    pointDistance,
    pointLineDistance as distanceToLine,
} from '../../../tests/fixtures/rocketConstraintSketch';

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
    it('should solve PARALLEL constraint', () => {
        state.entities.set('l1_p1', { id: 'l1_p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('l1_p2', { id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true }); // Horizontal fixed
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

        state.entities.set('l2_p1', { id: 'l2_p1', type: 'POINT', x: 0, y: 10, fixed: false }); // Start here
        state.entities.set('l2_p2', { id: 'l2_p2', type: 'POINT', x: 5, y: 20, fixed: false }); // Diagonal
        state.entities.set('l2', { id: 'l2', type: 'LINE', p1: 'l2_p1', p2: 'l2_p2' });

        state.constraints.push({
            id: 'c1',
            type: 'PARALLEL',
            entities: ['l1', 'l2']
        });

        solver.solve(state);

        const p1 = asPoint(state.entities.get('l2_p1'));
        const p2 = asPoint(state.entities.get('l2_p2'));

        // Slope should be 0 (horizontal)
        const dy = p2.y - p1.y;
        const dx = p2.x - p1.x;
        expect(Math.abs(dy)).toBeLessThan(0.1);
        expect(Math.abs(dx)).toBeGreaterThan(1);
    });

    it('should solve PERPENDICULAR constraint', () => {
        state.entities.set('l1_p1', { id: 'l1_p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('l1_p2', { id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true }); // Horizontal fixed
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

        state.entities.set('l2_p1', { id: 'l2_p1', type: 'POINT', x: 5, y: 5, fixed: false });
        state.entities.set('l2_p2', { id: 'l2_p2', type: 'POINT', x: 6, y: 6, fixed: false }); // Diagonal
        state.entities.set('l2', { id: 'l2', type: 'LINE', p1: 'l2_p1', p2: 'l2_p2' });

        state.constraints.push({
            id: 'c1',
            type: 'PERPENDICULAR',
            entities: ['l1', 'l2']
        });

        solver.solve(state);

        const p1 = asPoint(state.entities.get('l2_p1'));
        const p2 = asPoint(state.entities.get('l2_p2'));

        // Should be vertical (x constant)
        const dx = p2.x - p1.x;
        expect(Math.abs(dx)).toBeLessThan(0.1);
    });

    it('should solve TANGENT constraint (Circle-Line)', () => {
        state.entities.set('c_center', { id: 'c_center', type: 'POINT', x: 0, y: 10, fixed: false });
        state.entities.set('c1', { id: 'c1', type: 'CIRCLE', center: 'c_center', radius: 10 });

        state.entities.set('l1_p1', { id: 'l1_p1', type: 'POINT', x: -10, y: 0, fixed: true });
        state.entities.set('l1_p2', { id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true }); // Line on X axis
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

        // Circle center is at (0, 10), radius 10. Touches line at (0,0). Already tangent.
        // Let's move center away.
        state.entities.set('c_center', { id: 'c_center', type: 'POINT', x: 0, y: 15, fixed: false });

        state.constraints.push({
            id: 'c1',
            type: 'TANGENT',
            entities: ['c1', 'l1']
        });

        solver.solve(state);

        const center = asPoint(state.entities.get('c_center'));
        // Should settle at y=10 (radius distance from x-axis)
        expect(center.y).toBeCloseTo(10, 1); // loosen precision a bit for iterative solver
        expect(center.x).toBeCloseTo(0);
    });
    it('should solve RADIUS constraint', () => {
        state.entities.set('c_center', { id: 'c_center', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('c1', { id: 'c1', type: 'CIRCLE', center: 'c_center', radius: 10 });

        state.constraints.push({
            id: 'c_radius',
            type: 'RADIUS',
            entities: ['c1'],
            value: 20
        });

        solver.solve(state);

        // Can't check state.entities directly for radius change because 'c1' object might be replaced or mutated?
        // In our memory model, it's mutated in place.
        // But let's check:
        const c1 = state.entities.get('c1');
        if (c1?.type !== 'CIRCLE') throw new Error('Not a circle');

        expect(c1.radius).toBeCloseTo(20);
    });

    it('should solve ANGLE constraint', () => {
        state.entities.set('l1_p1', { id: 'l1_p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('l1_p2', { id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true }); // Horizontal 0deg
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

        state.entities.set('l2_p1', { id: 'l2_p1', type: 'POINT', x: 0, y: 0, fixed: true }); // Shared point
        state.entities.set('l2_p2', { id: 'l2_p2', type: 'POINT', x: 10, y: 10, fixed: false }); // 45 deg
        state.entities.set('l2', { id: 'l2', type: 'LINE', p1: 'l2_p1', p2: 'l2_p2' });

        // Force to 90 degrees
        state.constraints.push({
            id: 'c_angle',
            type: 'ANGLE',
            entities: ['l1', 'l2'],
            value: 90
        });

        solver.solve(state);

        const p2 = asPoint(state.entities.get('l2_p2'));
        const dx = p2.x;
        const dy = p2.y;
        // Expect vertical line: x ~ 0, y > 0
        expect(Math.abs(dx)).toBeLessThan(0.1);
        expect(dy).toBeGreaterThan(5);
    });

    it('should solve EQUAL_LENGTH constraint', () => {
        state.entities.set('l1_p1', { id: 'l1_p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('l1_p2', { id: 'l1_p2', type: 'POINT', x: 10, y: 0, fixed: true }); // Len 10 (Fixed)
        state.entities.set('l1', { id: 'l1', type: 'LINE', p1: 'l1_p1', p2: 'l1_p2' });

        state.entities.set('l2_p1', { id: 'l2_p1', type: 'POINT', x: 0, y: 10, fixed: true }); // Fixed start
        state.entities.set('l2_p2', { id: 'l2_p2', type: 'POINT', x: 0, y: 15, fixed: false }); // Len 5
        state.entities.set('l2', { id: 'l2', type: 'LINE', p1: 'l2_p1', p2: 'l2_p2' });

        state.constraints.push({
            id: 'c_eq',
            type: 'EQUAL_LENGTH',
            entities: ['l1', 'l2']
        });

        solver.solve(state);

        const l2_p2 = asPoint(state.entities.get('l2_p2'));
        const len2 = l2_p2.y - 10;

        // L1 is fixed at 10. L2 should grow to 10.
        expect(len2).toBeCloseTo(10);
    });

    it('should solve CONCENTRIC constraint', () => {
        state.entities.set('c1_center', { id: 'c1_center', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('c1', { id: 'c1', type: 'CIRCLE', center: 'c1_center', radius: 8 });

        state.entities.set('c2_center', { id: 'c2_center', type: 'POINT', x: 12, y: -6, fixed: false });
        state.entities.set('c2', { id: 'c2', type: 'CIRCLE', center: 'c2_center', radius: 3 });

        state.constraints.push({
            id: 'concentric',
            type: 'CONCENTRIC',
            entities: ['c1', 'c2']
        });

        solver.solve(state);

        const center = asPoint(state.entities.get('c2_center'));
        expect(center.x).toBeCloseTo(0);
        expect(center.y).toBeCloseTo(0);
    });

    it('should solve SYMMETRIC point constraint across a line', () => {
        state.entities.set('axis_p1', { id: 'axis_p1', type: 'POINT', x: 0, y: 0, fixed: true });
        state.entities.set('axis_p2', { id: 'axis_p2', type: 'POINT', x: 0, y: 10, fixed: true });
        state.entities.set('axis', { id: 'axis', type: 'LINE', p1: 'axis_p1', p2: 'axis_p2' });

        state.entities.set('left', { id: 'left', type: 'POINT', x: -10, y: 4, fixed: true });
        state.entities.set('right', { id: 'right', type: 'POINT', x: 6, y: 1, fixed: false });

        state.constraints.push({
            id: 'symmetric',
            type: 'SYMMETRIC',
            entities: ['left', 'right', 'axis']
        });

        solver.solve(state);

        const right = asPoint(state.entities.get('right'));
        expect(right.x).toBeCloseTo(10);
        expect(right.y).toBeCloseTo(4);
    });

    it('solves a rocket-keychain sketch using v0.4 constraint families together', () => {
        state = createRocketConstraintState();

        solver.solve(state);

        const rightShoulder = asPoint(state.entities.get('right_shoulder'));
        const rightFinTip = asPoint(state.entities.get('right_fin_tip'));
        const rightFinRoot = asPoint(state.entities.get('right_fin_root'));
        const windowCenter = asPoint(state.entities.get('window_center'));
        const innerWindowCenter = asPoint(state.entities.get('inner_window_center'));
        const skinCenter = asPoint(state.entities.get('skin_center'));
        const leftShoulder = asPoint(state.entities.get('left_shoulder'));
        const nose = asPoint(state.entities.get('nose'));

        expect(rightShoulder.x).toBeCloseTo(24, 2);
        expect(rightShoulder.y).toBeCloseTo(34, 2);
        expect(rightFinTip.x).toBeCloseTo(54.2, 1);
        expect(rightFinTip.y).toBeCloseTo(-42.1, 1);
        expect(rightFinRoot.x).toBeCloseTo(22, 2);
        expect(rightFinRoot.y).toBeCloseTo(-22, 2);
        expect(pointDistance(windowCenter, asPoint(state.entities.get('axis_top')))).toBeCloseTo(46, 1);
        expect(innerWindowCenter.x).toBeCloseTo(windowCenter.x, 2);
        expect(innerWindowCenter.y).toBeCloseTo(windowCenter.y, 2);

        const finAngle = lineAngleDeg(rightFinRoot, rightFinTip);
        expect(finAngle).toBeCloseTo(-32, 1);
        expect(distanceToLine(skinCenter, leftShoulder, nose)).toBeCloseTo(10, 1);
    });
});

// Deterministic jitter in [-1, 1] so the "drawn roughly right" starting points are reproducible.
function makeNoise(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return (state / 2 ** 32) * 2 - 1;
    };
}

function polygonState(n: number, edge: number, jitter: number, scale = 1): { state: SolverState; worstEdgeError: () => number } {
    const noise = makeNoise(12345);
    const radius = edge / (2 * Math.sin(Math.PI / n));
    const entities = new Map<string, SketchEntity>();
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        entities.set(`p${i}`, {
            id: `p${i}`, type: 'POINT',
            x: (radius * Math.cos(angle) + noise() * edge * jitter) * scale,
            y: (radius * Math.sin(angle) + noise() * edge * jitter) * scale,
            fixed: i === 0,
        });
    }
    const constraints = Array.from({ length: n }, (_, i) => ({
        id: `d${i}`, type: 'DISTANCE' as const, entities: [`p${i}`, `p${(i + 1) % n}`], value: edge * scale,
    }));
    const worstEdgeError = () => {
        let worst = 0;
        for (let i = 0; i < n; i++) {
            const a = asPoint(entities.get(`p${i}`));
            const b = asPoint(entities.get(`p${(i + 1) % n}`));
            worst = Math.max(worst, Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - edge * scale));
        }
        return worst;
    };
    return { state: { entities, constraints }, worstEdgeError };
}

describe('ConstraintSolver — long chains and closed loops', () => {
    // The old one-constraint-at-a-time relaxation moved a correction only a link or
    // two per pass, so 100 passes left these loops with edges 0.02 to 0.09 off.
    it.each([12, 50, 200])('closes a %i-vertex loop of equal edges drawn roughly right', (n) => {
        const { state, worstEdgeError } = polygonState(n, 10, 0.15);
        const result = new ConstraintSolver().solve(state);

        expect(result.converged).toBe(true);
        expect(result.iterations).toBeLessThan(30);
        expect(worstEdgeError()).toBeLessThan(1e-6);
        // Independent of the solver's own report.
        expect(result.residual).toBeLessThan(1e-6);
    });

    it('does not depend on the sketch size (millimetres to metres)', () => {
        for (const scale of [1e-3, 1, 1e3]) {
            const { state, worstEdgeError } = polygonState(50, 10, 0.15, scale);
            const result = new ConstraintSolver().solve(state);
            expect(result.converged).toBe(true);
            expect(worstEdgeError() / scale).toBeLessThan(1e-6);
        }
    });

    it('fully constrains a rectangle subdivided along its sides', () => {
        const k = 25, width = 100, height = 60;
        const entities = new Map<string, SketchEntity>();
        const noise = makeNoise(777);
        const side: string[][] = [[], [], [], []];
        const place = (list: string[], id: string, x: number, y: number, fixed = false) => {
            entities.set(id, { id, type: 'POINT', x: x + noise() * 0.4, y: y + noise() * 0.4, fixed });
            list.push(id);
        };
        const s = width / k, t = height / k;
        for (let i = 0; i < k; i++) place(side[0], `b${i}`, i * s, 0, i === 0);
        for (let i = 0; i < k; i++) place(side[1], `r${i}`, width, i * t);
        for (let i = 0; i < k; i++) place(side[2], `t${i}`, width - i * s, height);
        for (let i = 0; i < k; i++) place(side[3], `l${i}`, 0, height - i * t);
        const corners = ['r0', 't0', 'l0', 'b0'];
        const constraints: SolverState['constraints'] = [];
        side.forEach((ids, sideIndex) => {
            const path = [...ids, corners[sideIndex]];
            const horizontal = sideIndex % 2 === 0;
            for (let i = 0; i < path.length - 1; i++) {
                constraints.push({ id: `c${constraints.length}`, type: horizontal ? 'HORIZONTAL' : 'VERTICAL', entities: [path[i], path[i + 1]] });
                constraints.push({ id: `c${constraints.length}`, type: 'DISTANCE', entities: [path[i], path[i + 1]], value: horizontal ? s : t });
            }
        });

        const result = new ConstraintSolver().solve({ entities, constraints });

        expect(result.converged).toBe(true);
        expect(result.residual).toBeLessThan(1e-8);
        expect(result.degreesOfFreedom).toBe(0);
        // The anchor b0 is fixed where it was drawn, so the rectangle lands relative to it.
        const anchor = asPoint(entities.get('b0'));
        const far = asPoint(entities.get('t0'));
        expect(far.x - anchor.x).toBeCloseTo(width, 6);
        expect(far.y - anchor.y).toBeCloseTo(height, 6);
    });
});

describe('ConstraintSolver — result reporting', () => {
    it('reports the remaining degrees of freedom', () => {
        const entities = new Map<string, SketchEntity>([
            ['a', { id: 'a', type: 'POINT', x: 0, y: 0, fixed: true }],
            ['b', { id: 'b', type: 'POINT', x: 8, y: 1, fixed: false }],
        ]);
        const result = new ConstraintSolver().solve({
            entities,
            constraints: [{ id: 'd', type: 'DISTANCE', entities: ['a', 'b'], value: 10 }],
        });

        expect(result.converged).toBe(true);
        // b can still swing round a: 2 coordinates, 1 equation.
        expect(result.degreesOfFreedom).toBe(1);
        expect(result.dependentEquations).toBe(0);
    });

    it('flags a dependent equation, and rejects a genuine contradiction', () => {
        const mk = () => new Map<string, SketchEntity>([
            ['a', { id: 'a', type: 'POINT', x: 0, y: 0, fixed: true }],
            ['b', { id: 'b', type: 'POINT', x: 10, y: 0, fixed: false }],
        ]);
        const consistent = new ConstraintSolver().solve({
            entities: mk(),
            constraints: [
                { id: 'd1', type: 'DISTANCE', entities: ['a', 'b'], value: 10 },
                { id: 'd2', type: 'DISTANCE', entities: ['a', 'b'], value: 10 },
            ],
        });
        expect(consistent.converged).toBe(true);
        expect(consistent.dependentEquations).toBe(1);

        const contradictory = new ConstraintSolver().solve({
            entities: mk(),
            constraints: [
                { id: 'd1', type: 'DISTANCE', entities: ['a', 'b'], value: 10 },
                { id: 'd2', type: 'DISTANCE', entities: ['a', 'b'], value: 20 },
            ],
        });
        expect(contradictory.converged).toBe(false);
        expect(contradictory.residual).toBeGreaterThan(1);
    });

    it('moves coincident points off each other instead of dividing by zero', () => {
        const entities = new Map<string, SketchEntity>([
            ['a', { id: 'a', type: 'POINT', x: 3, y: 3, fixed: true }],
            ['b', { id: 'b', type: 'POINT', x: 3, y: 3, fixed: false }],
        ]);
        const result = new ConstraintSolver().solve({
            entities,
            constraints: [{ id: 'd', type: 'DISTANCE', entities: ['a', 'b'], value: 5 }],
        });
        const b = asPoint(entities.get('b'));
        expect(Number.isFinite(b.x) && Number.isFinite(b.y)).toBe(true);
        expect(result.converged).toBe(true);
        expect(Math.hypot(b.x - 3, b.y - 3)).toBeCloseTo(5, 6);
    });

    it('reports an empty constraint set as trivially converged', () => {
        const result = new ConstraintSolver().solve({ entities: new Map(), constraints: [] });
        expect(result).toMatchObject({ converged: true, residual: 0, iterations: 0 });
    });
});
