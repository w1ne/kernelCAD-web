// W4 inspection — Task 6: STS3215 golden acceptance test.
//
// Freezes the inspect-step report for the bundled Feetech STS3215 servo
// STEP file against literals captured from a verified run and cross-checked
// hole-by-hole against the raw STEP text (every reported hole corresponds
// 1:1 to a CYLINDRICAL_SURFACE entity in the file).
//
// Part-local axes convention observed in the file:
//   - Every detected hole is axial along ±Z.
//   - The servo output face is the +Z max face of the body: the four-hole
//     horn-mounting square sits on the mouth plane z = 18.7, exactly 1.5 mm
//     below bboxExact.max.z = 20.2, with all four axes (0, 0, -1) pointing
//     into the body. A matching square exits at z = -15.6 (through holes).
//
// Note on the mounting-square pattern: an earlier plan claimed the output
// face carried a (±5, ±7.7) pattern with 10.0 × 15.4 mm spacings. That
// pattern was verified ABSENT from the file — an exhaustive search over all
// four-hole combinations found a best match 2.5 mm off. The actual geometry,
// confirmed in the raw STEP text, is a 9.899 × 9.899 mm square (holes on a
// Ø14 circle) centered at (12.5, 0): centers (12.5 ± 4.95, ±4.95). The
// literals below are frozen from that STEP-text-verified capture.
//
// Bore-reporting convention: the detector reports one entry per wall
// segment, not per physical bore. Each of the 4 through bores in the
// horn-mounting square crosses two wall segments (mouths at z = 18.7 and
// z = -15.6), so it contributes TWO '2.50/through' entries — hence the
// census counts 8 through entries for 4 physical bores, and 17 holes
// total. A future detector improvement that merges coaxial through
// segments into one bore would legitimately change the census 8 -> 4 and
// the total 17 -> 13; refresh these goldens from a verified run if that
// lands. Similarly, faceCount 182 depends on how OCCT sews the imported
// shells and may shift with sewing-tolerance changes.

import { beforeAll, describe, expect, it } from 'vitest';
import { inspectStepFile } from '../../../src/agent/inspect/inspectStep';
import type {
  StepInspectReport,
  StepSolidReport,
} from '../../../src/agent/inspect/inspectStep';

const FIXTURE = `${process.cwd()}/examples/robot-arm/so100/parts/STS3215.step`;

let report: StepInspectReport;
let body: StepSolidReport;

beforeAll(async () => {
  report = await inspectStepFile(FIXTURE);
  body = report.solids[0];
}, 60_000);

describe('inspect-step STS3215 golden acceptance', () => {
  it('reports one solid named Body1 with the frozen face count, volume, and bbox', () => {
    expect(report.solidCount).toBe(1);
    expect(body.name).toBe('Body1');
    expect(body.faceCount).toBe(182);
    expect(body.volumeMm3).toBeCloseTo(36217, 0);
    // bboxExact is the tessellated AABB: 1 d.p. keeps the golden immune
    // to mesh-deflection changes while still pinning the 1-d.p. facts.
    expect(body.bboxExact.min[0]).toBeCloseTo(-22.7, 1);
    expect(body.bboxExact.min[1]).toBeCloseTo(-12.4, 1);
    expect(body.bboxExact.min[2]).toBeCloseTo(-19.4, 1);
    expect(body.bboxExact.max[0]).toBeCloseTo(22.7, 1);
    expect(body.bboxExact.max[1]).toBeCloseTo(12.4, 1);
    expect(body.bboxExact.max[2]).toBeCloseTo(20.2, 1);
    expect(body.holes).toHaveLength(17);
  });

  it('hole census by (diameter, kind): 8x Ø1.5 blind, 8x Ø2.5 through, 1x Ø2.5 blind', () => {
    const census = new Map<string, number>();
    for (const h of body.holes) {
      const key = `${h.diameterMm.toFixed(2)}/${h.kind}`;
      census.set(key, (census.get(key) ?? 0) + 1);
    }
    expect(Object.fromEntries(census)).toEqual({
      '1.50/blind': 8,
      '2.50/through': 8,
      '2.50/blind': 1,
    });
  });

  it('output face (+Z) carries a 4-hole Ø2.5 through square: 9.899 mm sides on a Ø14 circle', () => {
    const maxZ = body.bboxExact.max[2];
    // The output-face group: holes whose mouth plane sits within 2 mm of
    // the bbox top face (the actual gap is 1.5 mm).
    const square = body.holes.filter(
      (h) => Math.abs(h.axisOrigin[2] - maxZ) <= 2,
    );
    expect(square).toHaveLength(4);

    for (const h of square) {
      const label = `hole at (${h.axisOrigin})`;
      expect(h.kind, label).toBe('through');
      expect(h.diameterMm, label).toBeCloseTo(2.5, 2);
      // Coplanar mouths at z = 18.7 (1.5 mm below bbox max z = 20.2).
      expect(h.axisOrigin[2], label).toBeCloseTo(18.7, 2);
      // All axes point straight into the body.
      expect(h.axisDirection[0], label).toBeCloseTo(0, 3);
      expect(h.axisDirection[1], label).toBeCloseTo(0, 3);
      expect(h.axisDirection[2], label).toBeCloseTo(-1, 3);
    }

    // Equal diameters within 0.01 and coplanar mouths within 0.05 mm.
    const diameters = square.map((h) => h.diameterMm);
    expect(Math.max(...diameters) - Math.min(...diameters)).toBeLessThanOrEqual(0.01);
    const mouthZs = square.map((h) => h.axisOrigin[2]);
    expect(Math.max(...mouthZs) - Math.min(...mouthZs)).toBeLessThanOrEqual(0.05);

    // Centers: (12.5 ± 4.95, ±4.95) — all four quadrant corners present.
    const corners: Array<[number, number]> = [
      [12.5 - 4.95, -4.95],
      [12.5 + 4.95, -4.95],
      [12.5 - 4.95, 4.95],
      [12.5 + 4.95, 4.95],
    ];
    for (const [cx, cy] of corners) {
      const match = square.find(
        (h) =>
          Math.abs(h.axisOrigin[0] - cx) <= 0.05 &&
          Math.abs(h.axisOrigin[1] - cy) <= 0.05,
      );
      expect(match, `square corner near (${cx}, ${cy})`).toBeDefined();
    }

    // Pairwise in-plane spacings: four 9.899 mm sides + two 14.0 mm diagonals.
    const spacings: number[] = [];
    for (let i = 0; i < square.length; i++) {
      for (let j = i + 1; j < square.length; j++) {
        spacings.push(
          Math.hypot(
            square[i].axisOrigin[0] - square[j].axisOrigin[0],
            square[i].axisOrigin[1] - square[j].axisOrigin[1],
          ),
        );
      }
    }
    spacings.sort((a, b) => a - b);
    expect(spacings).toHaveLength(6);
    for (const side of spacings.slice(0, 4)) {
      expect(Math.abs(side - 9.899)).toBeLessThanOrEqual(0.05);
    }
    for (const diagonal of spacings.slice(4)) {
      expect(Math.abs(diagonal - 14.0)).toBeLessThanOrEqual(0.05);
    }
  });

  it('8x Ø1.5 blind case-screw holes: depth 1.5, mouths on z = ±15.9, axes into the body', () => {
    const pins = body.holes.filter(
      (h) => h.kind === 'blind' && Math.abs(h.diameterMm - 1.5) <= 0.01,
    );
    expect(pins).toHaveLength(8);

    // Frozen mouth centers per face. Top face (z = +15.9) and bottom face
    // (z = -15.9) differ in the second x position (-16.5 vs -20.3).
    const expected: Array<{ x: number; y: number; z: number }> = [
      { x: 4.2, y: -10.25, z: 15.9 },
      { x: 4.2, y: 10.25, z: 15.9 },
      { x: -16.5, y: -10.25, z: 15.9 },
      { x: -16.5, y: 10.25, z: 15.9 },
      { x: 4.2, y: -10.25, z: -15.9 },
      { x: 4.2, y: 10.25, z: -15.9 },
      { x: -20.3, y: -10.25, z: -15.9 },
      { x: -20.3, y: 10.25, z: -15.9 },
    ];
    for (const { x, y, z } of expected) {
      const match = pins.find(
        (h) =>
          Math.abs(h.axisOrigin[0] - x) <= 0.05 &&
          Math.abs(h.axisOrigin[1] - y) <= 0.05 &&
          Math.abs(h.axisOrigin[2] - z) <= 0.05,
      );
      expect(match, `Ø1.5 blind hole at (${x}, ${y}, ${z})`).toBeDefined();
      expect(match!.depthMm).toBeCloseTo(1.5, 2);
      // Axis points INTO the body: -Z from the top face, +Z from the bottom.
      const inward = z > 0 ? -1 : 1;
      expect(match!.axisDirection[0]).toBeCloseTo(0, 3);
      expect(match!.axisDirection[1]).toBeCloseTo(0, 3);
      expect(match!.axisDirection[2]).toBeCloseTo(inward, 3);
    }
  });

  it('single Ø2.5 blind hole has depth 3.9 at (12.5, 0, -18.3)', () => {
    const blind25 = body.holes.filter(
      (h) => h.kind === 'blind' && Math.abs(h.diameterMm - 2.5) <= 0.01,
    );
    expect(blind25).toHaveLength(1);
    expect(blind25[0].depthMm).toBeCloseTo(3.9, 2);
    expect(blind25[0].axisOrigin[0]).toBeCloseTo(12.5, 1);
    expect(blind25[0].axisOrigin[1]).toBeCloseTo(0, 1);
    expect(blind25[0].axisOrigin[2]).toBeCloseTo(-18.3, 1);
  });
});
