// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { convertSketchEntitiesToConstraints } from '../../constraints/sketchConverter';
import type { SketchEntity } from '../../../shared/types/sketch';
import type { SolverState, Point as SolverPoint, Line as SolverLine } from '../../constraints/types';
import { ConstraintSolver } from '../../constraints/solver';

describe('Sketch to Constraint Integration', () => {
    it('should convert a line with length constraint into solver entities and constraints', () => {
        const line: SketchEntity = {
            id: 'line1',
            type: 'line',
            start: [0, 0],
            end: [100, 0],
            constraints: { length: 50 } // Typed dimension is 50
        };

        const { entities, constraints } = convertSketchEntitiesToConstraints([line]);

        // Should have 2 points and 1 line in solver space
        const solverEntities = Array.from(entities.values());
        expect(solverEntities.filter((e: any) => e.type === 'POINT')).toHaveLength(2);
        expect(solverEntities.filter((e: any) => e.type === 'LINE')).toHaveLength(1);

        // Should have a DISTANCE constraint
        expect(constraints).toHaveLength(1);
        expect(constraints[0].type).toBe('DISTANCE');
        expect(constraints[0].value).toBe(50);

        // Run solver to see if it moves the end point
        const solver = new ConstraintSolver();
        const state: SolverState = { entities, constraints };
        solver.solve(state);

        const lineEntity = solverEntities.find(e => e.type === 'LINE') as SolverLine;
        const p1 = entities.get(lineEntity.p1) as SolverPoint;
        const p2 = entities.get(lineEntity.p2) as SolverPoint;

        const solvedDist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        expect(solvedDist).toBeCloseTo(50, 2);
    });

    it('should convert a circle with radius constraint', () => {
        const circle: SketchEntity = {
            id: 'circle1',
            type: 'circle',
            center: [0, 0],
            radius: 30,
            constraints: { radius: 25 }
        };

        const { entities, constraints } = convertSketchEntitiesToConstraints([circle]);

        expect(entities.size).toBe(2); // Center point + Circle
        expect(constraints).toHaveLength(1);
        expect(constraints[0].type).toBe('RADIUS');
        expect(constraints[0].value).toBe(25);
    });

    it('should convert a line with angle constraint', () => {
        const line: SketchEntity = {
            id: 'line2',
            type: 'line',
            start: [0, 0],
            end: [10, 10],
            constraints: { length: 10, angle: 0 } // Horizontal line 10 units long
        };

        const { entities, constraints } = convertSketchEntitiesToConstraints([line]);

        expect(constraints).toHaveLength(2); // Distance + Angle
        expect(constraints.some((c: any) => c.type === 'ANGLE')).toBe(true);
        expect(constraints.find((c: any) => c.type === 'ANGLE')?.value).toBe(0);

        const solver = new ConstraintSolver();
        const state: SolverState = { entities, constraints };
        solver.solve(state);

        const solverEntities = Array.from(entities.values());
        const lineEntity = solverEntities.find((e: any) => e.type === 'LINE') as SolverLine;
        const p1 = entities.get(lineEntity.p1) as SolverPoint;
        const p2 = entities.get(lineEntity.p2) as SolverPoint;

        expect(p2.y - p1.y).toBeCloseTo(0, 2); // Should be horizontal
        expect(p2.x - p1.x).toBeCloseTo(10, 2);
    });
});
