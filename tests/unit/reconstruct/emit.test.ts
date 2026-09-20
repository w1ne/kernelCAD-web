// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/emit.test.ts
//
// Characterisation of the feature emitter: exact emitted source for every
// `Op` arm of `emitOp`, so the complexity split that follows is a pure
// move of code with byte-identical output.

import { describe, expect, it } from 'vitest';
import { emitScript } from '../../../src/agent/reconstruct/emit';
import type { ProfilePrim } from '../../../src/agent/reconstruct/profileFit';
import type { FeaturePlan, Op } from '../../../src/agent/reconstruct/planPhases/shared';
import type { CanonicalFrame } from '../../../src/agent/reconstruct/frame';

const FRAME: CanonicalFrame = {
  axis: [0, 0, 1],
  e1: [1, 0, 0],
  e2: [0, 1, 0],
  chosen: { axis: [0, 0, 1], explainedFraction: 1, capArea: 1, bands: 1, score: 1 },
  axisSnapped: true,
};

function planWith(ops: Op[]): FeaturePlan {
  return {
    pass: { index: 0, eps: 0.01, snapTol: 0, angleTolDeg: 1, allowThroughKeyword: true },
    origin: [0, 0, 0],
    body: {
      kind: 'extrude',
      blocks: [
        {
          z0: 0,
          z1: 10,
          loops: [],
          hParam: 'height',
          outline: 'circle',
          rounds: 'none',
          profile: { kind: 'circle', cx: '0', cy: '0', r: 'radius' },
        },
      ],
    },
    ops,
    params: [],
    literalSnaps: [],
    entryAssumptions: [],
    notRepresented: [],
    holeSummary: [],
    sharpenedArcs: 0,
  };
}

function emitOps(ops: Op[]): string {
  return emitScript(planWith(ops), { frame: FRAME, sourceName: 'test.stl' });
}

const LINE: ProfilePrim = { kind: 'line', a: [0, 0], b: [20, 0] };
const ARC: ProfilePrim = { kind: 'arc', a: [20, 0], b: [0, 20], c: [20, 20], r: 20, ccw: false };
const LINE2: ProfilePrim = { kind: 'line', a: [0, 20], b: [0, 0] };

describe('emitScript op arms', () => {
  it('emits a single axial hole with a counterbore and through depth', () => {
    const op: Op = {
      kind: 'holes',
      name: 'bore1',
      axis: 'Z',
      face: { byNormal: 'Z', level: 10, near: [1.5, 2.25, 10] },
      positions: [{ u: 1.5, v: 2.25, at: [1.5, 2.25, 10] }],
      diameter: 6.5,
      diameterParam: 'bore1Diameter',
      depth: 'through',
      depthParam: 'bore1Depth',
      counterbore: { diameter: 11, depth: 5, diameterParam: 'bore1CbDiameter', depthParam: 'bore1CbDepth' },
    };
    expect(emitOps([op])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // bore1: axial bore at (1.5, 2.25, 10); u/v are from the entry face centroid.
        .hole({ byNormal: 'Z', atZ: 10, near: [1.5, 2.25, 10] }, {
          u: 1.5,
          v: 2.25,
          diameter: bore1Diameter,
          depth: 'through',
          counterbore: { diameter: bore1CbDiameter, depth: bore1CbDepth },
          name: 'bore1',
        });
      "
    `);
  });

  it('emits multiple cross-axis holes at a numeric depth', () => {
    const op: Op = {
      kind: 'holes',
      name: 'sideBores',
      axis: 'X',
      face: { byNormal: 'X', level: 6 },
      positions: [
        { u: -3, v: 2.5, at: [6, -3, 2.5] },
        { u: 3, v: 2.5, at: [6, 3, 2.5] },
      ],
      diameter: 4,
      diameterParam: 'sideBoresDiameter',
      depth: 12,
    };
    expect(emitOps([op])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // sideBores: 2 cross (X) bores at (6, -3, 2.5) (6, 3, 2.5); u/v are from the entry face centroid.
        .holes({ byNormal: 'X', atX: 6 }, {
          positions: [
            { u: -3, v: 2.5 },
            { u: 3, v: 2.5 },
          ],
          diameter: sideBoresDiameter,
          depth: 12,
          name: 'sideBores',
        });
      "
    `);
  });

  it('emits a cutout from an arc-and-line profile', () => {
    const op: Op = {
      kind: 'cutout',
      name: 'pocket1',
      face: { byNormal: '-Y', level: 0 },
      prims: [LINE, ARC, LINE2],
      depth: 3,
      depthParam: 'pocket1Depth',
      at: [0, 5, 20],
    };
    expect(emitOps([op])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // pocket1: pocket entering the face centred at (0, 5, 20); profile is face-centroid relative.
        .cutout(
          path()
            .moveTo(0, 0)
            .lineTo(20, 0)
            .threePointsArc(0, 20, 5.858, 5.858)
            .close(),
          { face: { byNormal: '-Y', atY: 0 }, depth: pocket1Depth, name: 'pocket1' },
        );
      "
    `);
  });

  it('emits subtract cylinders for every axis orientation', () => {
    const base: Extract<Op, { kind: 'subtractCylinder' }> = {
      kind: 'subtractCylinder',
      name: 'bore',
      base: [1, 2, 3],
      length: 25,
      radius: 2.5,
    };
    expect(emitOps([{ ...base, axis: 'Z' }])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // bore: bore that no drilling feature can reach, cut as a boolean.
        .subtract(cylinder(25, 2.5).translate(1, 2, 3));
      "
    `);
    expect(emitOps([{ ...base, axis: 'X' }])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // bore: bore that no drilling feature can reach, cut as a boolean.
        .subtract(cylinder(25, 2.5).rotate([0, 1, 0], 90).translate(1, 2, 3));
      "
    `);
    expect(emitOps([{ ...base, axis: 'Y' }])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // bore: bore that no drilling feature can reach, cut as a boolean.
        .subtract(cylinder(25, 2.5).rotate([1, 0, 0], -90).translate(1, 2, 3));
      "
    `);
  });
  it('emits a single-group fillet with and without an edge selector', () => {
    const noSelector: Op = {
      kind: 'fillet',
      groups: [{ radius: 2, radiusParam: 'filletRadius', edgeCount: 4, selectors: [undefined] }],
    };
    const withSelector: Op = {
      kind: 'fillet',
      groups: [
        {
          radius: 1.5,
          radiusParam: 'fillet1Radius',
          edgeCount: 2,
          selectors: [{ atZ: 10, parallel: [0, 1, 0], tolerance: 0.1 }],
        },
      ],
    };
    expect(emitOps([noSelector])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // Constant-radius edge blends measured on the mesh: 4 edge(s) in 1 radius group(s).
        .fillet(filletRadius);
      "
    `);
    expect(emitOps([withSelector])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // Constant-radius edge blends measured on the mesh: 2 edge(s) in 1 radius group(s).
        .fillet(fillet1Radius, { atZ: 10, parallel: [0, 1, 0], tolerance: 0.1 });
      "
    `);
  });

  it('emits a multi-group fillet as one list', () => {
    const op: Op = {
      kind: 'fillet',
      groups: [
        { radius: 3, radiusParam: 'fillet1Radius', edgeCount: 2, selectors: [{ atZ: 8 }] },
        { radius: 1, radiusParam: 'fillet2Radius', edgeCount: 3, selectors: [undefined, { within: { xMin: 0, xMax: 1, yMin: 0, yMax: 1, zMin: 0, zMax: 1 } }] },
      ],
    };
    expect(emitOps([op])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // Constant-radius edge blends measured on the mesh: 5 edge(s) in 2 radius group(s).
        .fillet([
          { edges: { atZ: 8 }, radius: fillet1Radius },
          { edges: {}, radius: fillet2Radius },
          { edges: { within: { xMin: 0, xMax: 1, yMin: 0, yMax: 1, zMin: 0, zMax: 1 } }, radius: fillet2Radius },
        ]);
      "
    `);
  });

  it('emits a subtract prism', () => {
    const op: Op = {
      kind: 'subtractPrism',
      prims: [LINE, ARC, LINE2],
      z0: -2,
      length: 8,
    };
    expect(emitOps([op])).toMatchInlineSnapshot(`
      "// Reconstructed from test.stl by mesh_to_features.
      // Every dimension was measured from the mesh. Values snapped to a round
      // number are listed, with the measured value, in the assumption ledger.
      // Face queries pin the measured levels: change a height param and its
      // atZ/atX/atY together.


      // Block 1: circle profile, extruded z 0 → 10.
      const body = path()
        .moveTo(radius, 0)
        .threePointsArc(radius.negate(), 0, 0, radius)
        .threePointsArc(radius, 0, 0, radius.negate())
        .close()
        .extrude(height);

      return body
        // undefined: pocket whose opening is covered by material, cut as a boolean.
        .subtract(
          path()
            .moveTo(0, 0)
            .lineTo(20, 0)
            .threePointsArc(0, 20, 5.858, 5.858)
            .close()
            .extrude(8)
            .translate(0, 0, -2),
        );
      "
    `);
  });
});
