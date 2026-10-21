// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStep.test.ts
//
// Control-flow regression for the STEP import heal. The real OCCT behavior is
// covered by the CADGenBench proof run (see docs/submissions); these tests pin
// the contract: a valid unification replaces the shape, anything else leaves
// the untouched import in place, and raw OCCT handles are always released.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  unifiedValid: true,
  throwOnConstruct: false,
  deleted: [] as string[],
  unifyFacesArgs: [] as boolean[],
}));

vi.mock('replicad', () => {
  class FakeAnalyzer {
    constructor() {
      if (state.throwOnConstruct) throw new Error('binding rejected the shape');
    }
    IsValid_2(): boolean {
      return state.unifiedValid;
    }
    delete(): void {
      state.deleted.push('analyzer');
    }
  }
  class FakeUnify {
    constructor(_shape: unknown, _unifyEdges: boolean, unifyFaces: boolean) {
      if (state.throwOnConstruct) throw new Error('binding rejected the shape');
      state.unifyFacesArgs.push(unifyFaces);
    }
    Build(): void {}
    Shape(): unknown {
      return { unified: true };
    }
    delete(): void {
      state.deleted.push('unify');
    }
  }
  const oc = {
    BRepCheck_Analyzer: FakeAnalyzer,
    ShapeUpgrade_UnifySameDomain_2: FakeUnify,
  };
  return {
    getOC: () => oc,
    cast: (shape: unknown) => ({ castFrom: shape }),
  };
});

import { healImportedStep, __healTest } from './healStep';
import { getOC as replicadGetOC } from 'replicad';

const original = { wrapped: { id: 'original' }, faces: [] as unknown[] } as never;

beforeEach(() => {
  state.unifiedValid = true;
  state.throwOnConstruct = false;
  state.deleted = [];
  state.unifyFacesArgs = [];
  (original as { faces: unknown[] }).faces = [];
});

describe('healImportedStep', () => {
  it('returns the unified shape when same-domain unification is valid', () => {
    const result = healImportedStep(original);
    expect(result.unified).toBe(true);
    expect(result.shape).toEqual({ castFrom: { unified: true } });
    expect(state.deleted.sort()).toEqual(['analyzer', 'unify']);
  });

  it('skips face unification on a large import but still merges edges', () => {
    // The 206 fixture is 637 faces and face unification stalls in the wasm
    // build. Edge-only normalization is bounded and keeps the import usable.
    (original as { faces: unknown[] }).faces = new Array(300).fill({});
    const result = healImportedStep(original);
    expect(result.unified).toBe(true);
    expect(state.unifyFacesArgs).toEqual([false]);
  });

  it('keeps face unification for a small import', () => {
    (original as { faces: unknown[] }).faces = new Array(256).fill({});
    const result = healImportedStep(original);
    expect(result.unified).toBe(true);
    expect(state.unifyFacesArgs).toEqual([true]);
  });

  it('keeps the original import when the unified shape is invalid', () => {
    state.unifiedValid = false;
    const result = healImportedStep(original);
    expect(result.unified).toBe(false);
    expect(result.shape).toBe(original);
    expect(state.deleted.sort()).toEqual(['analyzer', 'unify']);
  });

  it('keeps the original import when OCCT throws', () => {
    state.throwOnConstruct = true;
    const result = healImportedStep(original);
    expect(result.unified).toBe(false);
    expect(result.shape).toBe(original);
  });

  it('keeps the original import when the heal binding is absent', () => {
    // A host build without ShapeUpgrade_UnifySameDomain must degrade to a plain import.
    const oc = replicadGetOC() as unknown as Record<string, unknown>;
    const saved = oc.ShapeUpgrade_UnifySameDomain_2;
    delete oc.ShapeUpgrade_UnifySameDomain_2;
    try {
      const result = healImportedStep(original);
      expect(result.unified).toBe(false);
      expect(result.shape).toBe(original);
    } finally {
      oc.ShapeUpgrade_UnifySameDomain_2 = saved;
    }
  });
});

describe('large-import face unification guard', () => {
  it('allows a bounded face pass only for a large, valid, small-cluster import', () => {
    expect(__healTest.largeFaceUnifyDecision(1026, true, 3)).toBe(true);
    expect(__healTest.largeFaceUnifyDecision(1026, true, 8)).toBe(true);
  });

  it('keeps edge-only normalization for the stall-prone cases', () => {
    // Too small to pay for the large-import pass.
    expect(__healTest.largeFaceUnifyDecision(1000, true, 3)).toBe(false);
    // 206/238/243 class: a same-surface cluster large enough to stall the wasm unifier.
    expect(__healTest.largeFaceUnifyDecision(1026, true, 9)).toBe(false);
    expect(__healTest.largeFaceUnifyDecision(1026, true, 12)).toBe(false);
    // 202/240 class: invalid topology is repaired, not merged.
    expect(__healTest.largeFaceUnifyDecision(1026, false, 3)).toBe(false);
    // Nothing to merge.
    expect(__healTest.largeFaceUnifyDecision(1026, true, 1)).toBe(false);
  });
});

describe('pinch notch geometry', () => {
  // Face bounds of the 240 fixture's unorientable ribbon.
  const faceBounds = {
    lo: [-1.28, 45.31, -15.61] as [number, number, number],
    hi: [26.11, 50.44, -10.0] as [number, number, number],
  };

  it('keeps the interior side of the left fold clear of the tangency band', () => {
    // Cluster measured on the real fixture (26 exact touch points).
    const cluster = [
      [-0.855, 49.53, -11.043],
      [-0.597, 49.858, -10.637],
    ] as [number, number, number][];
    const box = __healTest.notchBox(__healTest.pointsBounds(cluster), faceBounds);
    // x-min snaps to the face border; y-min stays at cluster - 0.6 (48.93),
    // which is the side that avoids the tangent surface at y ~ 48.4.
    expect(box.lo[0]).toBeCloseTo(-1.78, 6);
    expect(box.lo[1]).toBeCloseTo(48.93, 6);
    expect(box.lo[2]).toBeCloseTo(-11.643, 6);
    expect(box.hi[0]).toBeCloseTo(0.003, 6);
    expect(box.hi[1]).toBeCloseTo(50.94, 6);
    expect(box.hi[2]).toBeCloseTo(-9.5, 6);
  });

  it('extends the right fold to the face border and keeps the two folds apart', () => {
    const left = [
      [-0.855, 49.53, -11.043],
      [-0.597, 49.858, -10.637],
    ] as [number, number, number][];
    const right = [
      [23.226, 49.293, -11.265],
      [24.048, 50.081, -10.335],
      [24.056, 50.081, -10.337],
    ] as [number, number, number][];
    const clusters = __healTest.clusterPoints([...left, ...right], 2);
    expect(clusters).toHaveLength(2);
    const rightCluster = clusters.find((cluster) => cluster[0][0] > 20)!;
    const box = __healTest.notchBox(__healTest.pointsBounds(rightCluster), faceBounds);
    expect(box.lo[0]).toBeCloseTo(22.626, 6);
    expect(box.hi[0]).toBeCloseTo(26.61, 6);
    expect(box.lo[1]).toBeCloseTo(48.693, 6);
    expect(box.hi[1]).toBeCloseTo(50.94, 6);
    expect(box.lo[2]).toBeCloseTo(-11.865, 6);
    expect(box.hi[2]).toBeCloseTo(-9.5, 6);
  });

  it('does not treat a near-miss as a shared wire vertex', () => {
    const first: [number, number, number][] = [
      [0, 0, 0],
      [1, 0, 0],
    ];
    expect(__healTest.shareEndpoint(first, [[0.7, 0, 0], [2, 0, 0]])).toBe(false);
    expect(__healTest.shareEndpoint(first, [[1, 0, 0], [2, 0, 0]])).toBe(true);
  });
});

describe('duplicate face notch geometry', () => {
  it('cuts the sliver that shares a bounding box with a much larger patch', () => {
    const boxes = __healTest.duplicateBounds([
      {
        bounds: {
          lo: [-40.1661, 13.7059, -16.2004],
          hi: [-39.2357, 14.0835, -16.0641],
        },
        areas: [0.00299, 0.17105],
      },
    ]);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].lo[0]).toBeCloseTo(-40.9661, 4);
    expect(boxes[0].lo[1]).toBeCloseTo(12.9059, 4);
    expect(boxes[0].lo[2]).toBeCloseTo(-17.0004, 4);
    expect(boxes[0].hi[0]).toBeCloseTo(-38.4357, 4);
    expect(boxes[0].hi[1]).toBeCloseTo(14.8835, 4);
    expect(boxes[0].hi[2]).toBeCloseTo(-15.2641, 4);
  });

  it('leaves same-size coincident patches alone', () => {
    expect(
      __healTest.duplicateBounds([
        {
          bounds: { lo: [0, 0, 0], hi: [1, 1, 1] },
          areas: [0.1, 0.12],
        },
      ]),
    ).toEqual([]);
  });
});

describe('reconstruction fallback', () => {
  it('falls back to unification when the repair bindings fail', () => {
    const oc = replicadGetOC() as unknown as Record<string, unknown>;
    const bindings = [
      'TopExp_Explorer_2',
      'TopoDS_Builder',
      'TopoDS_Shell',
      'TopoDS_Solid',
      'BRepAdaptor_Curve_2',
      'BRepAdaptor_Surface_2',
      'BRepExtrema_DistShapeShape_1',
      'BRepPrimAPI_MakeBox_4',
      'BRepAlgoAPI_Cut_3',
      'BRepBuilderAPI_MakeEdge_3',
      'BRepBuilderAPI_MakeWire_1',
      'BRepBuilderAPI_MakeFace_15',
      'BRepBuilderAPI_Sewing',
      'Bnd_Box_1',
      'BRepBndLib',
      'BRepGProp',
      'GProp_GProps_1',
      'gp_Pnt_3',
      'Message_ProgressRange_1',
      'TopLoc_Location_1',
      'BRepMesh_IncrementalMesh_2',
      'BRep_Tool',
    ];
    class BrokenBinding {
      constructor() {
        throw new Error('repair binding unavailable');
      }
    }
    const savedTopoDS = oc.TopoDS;
    for (const name of bindings) oc[name] = BrokenBinding;
    oc.TopoDS = { Face_1: () => ({}), Edge_1: () => ({}), Shell_1: () => ({}) };
    state.unifiedValid = false;
    try {
      const result = healImportedStep(original);
      expect(result.unified).toBe(false);
      expect(result.repaired).toBeUndefined();
      expect(result.shape).toBe(original);
    } finally {
      for (const name of bindings) delete oc[name];
      if (savedTopoDS === undefined) delete oc.TopoDS;
      else oc.TopoDS = savedTopoDS;
    }
  });
});
