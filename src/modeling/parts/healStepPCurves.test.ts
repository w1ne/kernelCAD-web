// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepPCurves.test.ts
//
// Regression cover for the pcurve-rebuild import heal: the acceptance rule
// (same solids, faces and volume) and the round-trip itself on a healthy
// solid. The trigger case is CADGenBench 217's input, whose one invalid
// B-spline face is a source-file pcurve defect; that file is not part of this
// repository, so the trigger is documented in AFTER-V6 and the mechanics are
// pinned here.
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import {
  PCURVE_REBUILD_VOLUME_TOL,
  importedShapeFacts,
  pcurveRebuildMatches,
  rebuildImportedPCurves,
} from './healStepPCurves';

beforeAll(async () => { await initOcct(); }, 60000);

function boxShape(): replicad.Shape3D {
  return replicad.makeBox([0, 0, 0], [10, 20, 30]);
}

describe('pcurveRebuildMatches', () => {
  const before = { solids: 1, faces: 6, volume: 6000 };

  it('accepts an identical body', () => {
    expect(pcurveRebuildMatches(before, { ...before })).toBe(true);
  });

  it('rejects a different solid or face count', () => {
    expect(pcurveRebuildMatches(before, { ...before, solids: 2 })).toBe(false);
    expect(pcurveRebuildMatches(before, { ...before, faces: 7 })).toBe(false);
  });

  it('rejects a volume change beyond the tolerance or an empty body', () => {
    const moved = 1 + PCURVE_REBUILD_VOLUME_TOL * 10;
    expect(pcurveRebuildMatches(before, { ...before, volume: before.volume * moved })).toBe(false);
    expect(pcurveRebuildMatches(before, { ...before, volume: 0 })).toBe(false);
  });
});

describe('rebuildImportedPCurves', () => {
  it('round-trips a healthy solid without changing its identity', async () => {
    const shape = boxShape();
    const rebuilt = await rebuildImportedPCurves(shape);
    expect(rebuilt).toBeDefined();
    expect(importedShapeFacts(rebuilt!)).toEqual(importedShapeFacts(shape));
  });

  it('reports solids, faces and volume for a re-imported STEP body', async () => {
    const blob = boxShape().blobSTEP();
    const imported = await replicad.importSTEP(blob) as replicad.Shape3D;
    const facts = importedShapeFacts(imported);
    expect(facts.solids).toBe(1);
    expect(facts.faces).toBe(6);
    expect(facts.volume).toBeCloseTo(6000, 3);
  });
});
