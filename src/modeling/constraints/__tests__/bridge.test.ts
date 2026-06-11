// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { decomposeUISketchEntities, syncUIEntities } from '../bridge';
import { type LineEntity, type RectangleEntity, type SketchEntity as UISketchEntity } from '../../../shared/types/sketch';
import { type Point as SolverPoint, type SketchEntity as SolverEntity } from '../types';
import { ConstraintSolver } from '../solver';

describe('SolverBridge', () => {
    it('should decompose a LineEntity into 2 points and 1 line', () => {
        const line: LineEntity = {
            id: 'line1',
            type: 'line',
            start: [0, 0],
            end: [10, 10]
        };

        const { solverEntities, pointMap } = decomposeUISketchEntities([line]);

        expect(solverEntities).toHaveLength(3);
        expect(solverEntities.filter(e => e.type === 'POINT')).toHaveLength(2);
        expect(solverEntities.filter(e => e.type === 'LINE')).toHaveLength(1);

        expect(pointMap.get('0.000000,0.000000')).toBe('line1_start');
        expect(pointMap.get('10.000000,10.000000')).toBe('line1_end');
    });

    it('should decompose a RectangleEntity into 4 points and 4 lines', () => {
        const rect: RectangleEntity = {
            id: 'rect1',
            type: 'rectangle',
            corner: [0, 0],
            width: 10,
            height: 10
        };

        const { solverEntities } = decomposeUISketchEntities([rect]);

        expect(solverEntities).toHaveLength(8); // 4 points + 4 lines
        expect(solverEntities.filter(e => e.type === 'POINT')).toHaveLength(4);
        expect(solverEntities.filter(e => e.type === 'LINE')).toHaveLength(4);
    });

    it('should sync solved coordinates back to UI entities', () => {
        const originalLine: LineEntity = {
            id: 'line1',
            type: 'line',
            start: [0, 0],
            end: [10, 10]
        };

        const solverEntitiesMap = new Map();
        solverEntitiesMap.set('line1_start', { id: 'line1_start', type: 'POINT', x: 5, y: 5, fixed: false } as SolverPoint);
        solverEntitiesMap.set('line1_end', { id: 'line1_end', type: 'POINT', x: 15, y: 15, fixed: false } as SolverPoint);

        const synced = syncUIEntities([originalLine], solverEntitiesMap);

        expect(synced[0].type).toBe('line');
        const syncedLine = synced[0] as LineEntity;
        expect(syncedLine.start).toEqual([5, 5]);
        expect(syncedLine.end).toEqual([15, 15]);
    });

    it('should solve a horizontal constraint through the bridge', () => {
        const line: LineEntity = {
            id: 'line1',
            type: 'line',
            start: [0, 0],
            end: [10, 2] // Not horizontal
        };

        // 1. Decompose
        const { solverEntities } = decomposeUISketchEntities([line]);
        const solverEntitiesMap = new Map<string, SolverEntity>();
        solverEntities.forEach(e => solverEntitiesMap.set(e.id, e));

        // 2. Add Horizontal Constraint
        const constraints = [{
            id: 'c1',
            type: 'HORIZONTAL' as const,
            entities: ['line1_start', 'line1_end']
        }];

        // Fix one point
        const p1 = solverEntitiesMap.get('line1_start') as SolverPoint;
        p1.fixed = true;

        // 3. Solve
        const solver = new ConstraintSolver();
        solver.solve({ entities: solverEntitiesMap, constraints });

        // 4. Sync
        const synced = syncUIEntities([line], solverEntitiesMap);
        const syncedLine = synced[0] as LineEntity;

        // Check if horizontal (Y coordinates should match)
        expect(syncedLine.start[1]).toBe(syncedLine.end[1]);
        expect(syncedLine.start).toEqual([0, 0]);
        // The solver should have moved p2.y to 0
        expect(syncedLine.end[1]).toBeCloseTo(0, 5);
    });
});
