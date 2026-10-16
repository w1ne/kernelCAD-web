// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Post-condition trust gate: solve_sketch must report whether the constraint
// solve actually converged below tolerance, and must NOT report ok:true when
// the worst constraint violation never settled (e.g. a contradictory constraint set).
import { describe, it, expect } from 'vitest';
import { solveSketchTool } from './constraints';
import type { Constraint, SketchEntity } from '../../../modeling/constraints/types';
import { CONSTRAINT_RESIDUAL_TOL, SKETCH_CONVERGENCE_RESIDUAL_TOL } from '../../../modeling/constraints/solver';
import { cloneRocketConstraintEntities, cloneRocketConstraintList } from '../../../../tests/fixtures/rocketConstraintSketch';

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

  // Regression: the convergence verdict must tolerate a NEARLY-consistent
  // over-constrained sketch. The rocket-keychain fixture mirrors a fin edge
  // (implied angle -31.9734 deg) yet also demands -32 deg: a 4.6e-4 rad conflict.
  // That is a usable sketch and must report converged/ok:true; the conflict
  // stays visible as a small non-zero residual, far below a genuine
  // contradiction (the DISTANCE 10 vs 20 case above leaves ~10).
  it('reports converged:true for a nearly-consistent over-constrained sketch', async () => {
    const r = await solveSketchTool({
      entities: cloneRocketConstraintEntities(),
      constraints: cloneRocketConstraintList(),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.converged).toBe(true);
      // The conflict is real (not solved to numerical zero) but within tolerance.
      expect(r.residual).toBeGreaterThan(CONSTRAINT_RESIDUAL_TOL);
      expect(r.residual).toBeLessThan(SKETCH_CONVERGENCE_RESIDUAL_TOL);
      const rightShoulder = r.entities.find(e => e.id === 'right_shoulder');
      expect(rightShoulder && rightShoulder.type === 'POINT' && rightShoulder.x).toBeCloseTo(24, 2);
    }
  });
});
