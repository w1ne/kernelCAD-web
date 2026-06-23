// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Post-condition trust gate: solve_sketch must report whether the constraint
// solve actually converged below tolerance, and must NOT report ok:true when
// the aggregate residual never settled (e.g. a contradictory constraint set).
import { describe, it, expect } from 'vitest';
import { solveSketchTool } from './constraints';
import type { Constraint, SketchEntity } from '../../../modeling/constraints/types';

describe('solve_sketch — converged reflects solver convergence', () => {
  it('reports converged:true and ok:true for a satisfiable constraint set', async () => {
    const entities: SketchEntity[] = [
      { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true },
      { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: false },
    ];
    const constraints: Constraint[] = [
      { id: 'c1', type: 'DISTANCE', entities: ['p1', 'p2'], value: 20 },
    ];

    const r = await solveSketchTool({ entities, constraints });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.converged).toBe(true);
      expect(r.residual).toBeLessThan(1e-3);
      const p2 = r.entities.find(e => e.id === 'p2');
      expect(p2 && p2.type === 'POINT' && p2.x).toBeCloseTo(20);
    }
  });

  it('reports converged:false and ok:false for a contradictory constraint set', async () => {
    // Both points fixed 10 apart, but a DISTANCE=20 is demanded. Neither
    // point may move, so the residual never falls below tolerance — the
    // solver cannot satisfy the constraints. This previously returned
    // ok:true (silent-wrong).
    const entities: SketchEntity[] = [
      { id: 'p1', type: 'POINT', x: 0, y: 0, fixed: true },
      { id: 'p2', type: 'POINT', x: 10, y: 0, fixed: true },
    ];
    const constraints: Constraint[] = [
      { id: 'c1', type: 'DISTANCE', entities: ['p1', 'p2'], value: 20 },
    ];

    const r = await solveSketchTool({ entities, constraints });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.converged).toBe(false);
      expect(r.residual).toBeGreaterThan(1e-3);
      expect(r.errors.length).toBeGreaterThan(0);
      // best-effort entities/constraints still surfaced for diagnosis
      expect(r.entities.length).toBe(2);
    }
  });
});
