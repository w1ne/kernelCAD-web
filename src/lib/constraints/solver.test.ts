import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintSolver } from './solver';
import type { SolverState, SketchEntity, Point } from './types';

function asPoint(e: SketchEntity | undefined): Point {
    if (!e || e.type !== 'POINT') {
        throw new Error(`Entity is not a point: ${JSON.stringify(e)}`);
    }
    return e;
}

function distance(a: Point, b: Point): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleDeg(a: Point, b: Point): number {
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

function pointLineDistance(point: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy);
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
        state.entities.set('axis_bottom', { id: 'axis_bottom', type: 'POINT', x: 0, y: -55, fixed: true });
        state.entities.set('axis_top', { id: 'axis_top', type: 'POINT', x: 0, y: 70, fixed: true });
        state.entities.set('axis', { id: 'axis', type: 'LINE', p1: 'axis_bottom', p2: 'axis_top' });

        state.entities.set('nose', { id: 'nose', type: 'POINT', x: 0, y: 58, fixed: true });
        state.entities.set('left_shoulder', { id: 'left_shoulder', type: 'POINT', x: -24, y: 34, fixed: true });
        state.entities.set('right_shoulder', { id: 'right_shoulder', type: 'POINT', x: 17, y: 28, fixed: false });
        state.entities.set('left_fin_tip', { id: 'left_fin_tip', type: 'POINT', x: -54.2, y: -42.1, fixed: true });
        state.entities.set('left_fin_root', { id: 'left_fin_root', type: 'POINT', x: -22, y: -22, fixed: true });
        state.entities.set('right_fin_tip', { id: 'right_fin_tip', type: 'POINT', x: 30, y: -46, fixed: false });
        state.entities.set('right_fin_root', { id: 'right_fin_root', type: 'POINT', x: 18, y: -19, fixed: false });

        state.entities.set('left_fin_edge', { id: 'left_fin_edge', type: 'LINE', p1: 'left_fin_root', p2: 'left_fin_tip' });
        state.entities.set('right_fin_edge', { id: 'right_fin_edge', type: 'LINE', p1: 'right_fin_root', p2: 'right_fin_tip' });
        state.entities.set('body_section', { id: 'body_section', type: 'LINE', p1: 'axis_bottom', p2: 'axis_top' });

        state.entities.set('window_center', { id: 'window_center', type: 'POINT', x: 7, y: 24, fixed: false });
        state.entities.set('outer_window', { id: 'outer_window', type: 'CIRCLE', center: 'window_center', radius: 8 });
        state.entities.set('inner_window_center', { id: 'inner_window_center', type: 'POINT', x: 11, y: 20, fixed: false });
        state.entities.set('inner_window', { id: 'inner_window', type: 'CIRCLE', center: 'inner_window_center', radius: 4 });

        state.entities.set('skin_center', { id: 'skin_center', type: 'POINT', x: -19, y: 34, fixed: false });
        state.entities.set('nose_skin', { id: 'nose_skin', type: 'CIRCLE', center: 'skin_center', radius: 10 });
        state.entities.set('nose_tangent', { id: 'nose_tangent', type: 'LINE', p1: 'left_shoulder', p2: 'nose' });

        state.constraints.push(
            { id: 'right_shoulder_sym', type: 'SYMMETRIC', entities: ['left_shoulder', 'right_shoulder', 'axis'] },
            { id: 'right_fin_tip_sym', type: 'SYMMETRIC', entities: ['left_fin_tip', 'right_fin_tip', 'axis'] },
            { id: 'right_fin_root_sym', type: 'SYMMETRIC', entities: ['left_fin_root', 'right_fin_root', 'axis'] },
            { id: 'window_distance_from_nose', type: 'DISTANCE', entities: ['axis_top', 'window_center'], value: 46 },
            { id: 'window_rings', type: 'CONCENTRIC', entities: ['outer_window', 'inner_window'] },
            { id: 'fin_angle', type: 'ANGLE', entities: ['right_fin_edge'], value: -32 },
            { id: 'nose_tangent_skin', type: 'TANGENT', entities: ['nose_skin', 'nose_tangent'] },
        );

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
        expect(distance(windowCenter, asPoint(state.entities.get('axis_top')))).toBeCloseTo(46, 1);
        expect(innerWindowCenter.x).toBeCloseTo(windowCenter.x, 2);
        expect(innerWindowCenter.y).toBeCloseTo(windowCenter.y, 2);

        const finAngle = angleDeg(rightFinRoot, rightFinTip);
        expect(finAngle).toBeCloseTo(-32, 1);
        expect(pointLineDistance(skinCenter, leftShoulder, nose)).toBeCloseTo(10, 1);
    });
});
