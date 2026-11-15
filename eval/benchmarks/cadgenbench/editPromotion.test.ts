// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression tests for the request-aware editing promotion classifier.

import { describe, expect, it } from 'vitest';
import type { StepInspectReport } from '../../../src/kernel/import/inspectStep';
import type { CylindricalHole } from '../../../src/kernel/backends/occt/holeDetection';
import { classifyEditPromotion, parseEditIntent } from './editPromotion';

function hole(diameter: number, x = 0, y = 0, z = 0): CylindricalHole {
  return {
    axisOrigin: [x, y, z],
    axisDirection: [0, 0, 1],
    diameterMm: diameter,
    depthMm: 20,
    kind: 'blind',
    faceCount: 1,
  };
}

function report(volume: number, faces: number, holes: CylindricalHole[] = [], size = 100): StepInspectReport {
  return {
    file: 'shape.step',
    solidCount: 1,
    holeDetection: 'exact',
    solids: [
      {
        index: 0,
        name: null,
        bboxExact: { min: [0, 0, 0], max: [size, size, size] },
        volumeMm3: volume,
        faceCount: faces,
        holes,
        holeDetection: 'exact',
      },
    ],
  };
}

/** The same report with the whole solid and its holes translated. */
function shifted(source: StepInspectReport, dx: number, dy = 0, dz = 0): StepInspectReport {
  const move = (p: [number, number, number]): [number, number, number] => [p[0] + dx, p[1] + dy, p[2] + dz];
  return {
    ...source,
    solids: source.solids.map((solid) => ({
      ...solid,
      bboxExact: solid.bboxExact && { min: move(solid.bboxExact.min), max: move(solid.bboxExact.max) },
      holes: solid.holes?.map((h) => ({ ...h, axisOrigin: move(h.axisOrigin) })),
    })),
  };
}

describe('classifyEditPromotion', () => {
  it('rejects an unchanged solid as a no-op', () => {
    const before = report(1_000_000, 20, [hole(188)]);
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 310mm.',
      before,
      after: report(1_000_000, 20, [hole(188)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'no-op' });
  });

  it('repairs a bore that stops short of the requested diameter', () => {
    // Target is a 310 mm central bore; 300 mm is a real edit but the wrong size.
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 310mm.',
      before: report(1_000_000, 20, [hole(188), hole(298)]),
      after: report(999_000, 20, [hole(188), hole(300)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude', expectedDirection: 'decrease' });
    expect(result.reason).toContain('310');
  });

  it('accepts a bore that reaches the requested diameter', () => {
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 310mm.',
      before: report(1_000_000, 20, [hole(188), hole(298)]),
      after: report(998_000, 20, [hole(188), hole(310)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('repairs a horizontal bore that stops at 20 mm instead of 10 mm', () => {
    const horizontal = { ...hole(20, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const beforeHorizontal = { ...hole(25, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const result = classifyEditPromotion({
      request: 'Decrease the diameter of the lone horizontal bore from 15mm to 10mm.',
      before: report(1_000_000, 20, [beforeHorizontal, hole(46, 0, 0, -31)]),
      after: report(1_000_000, 20, [horizontal, hole(46, 0, 0, -31)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude' });
  });

  it('accepts the exact horizontal bore reduction to 10 mm', () => {
    const correct = { ...hole(10, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const beforeHorizontal = { ...hole(25, -25, 0, 0), axisDirection: [0, 1, 0] as [number, number, number] };
    const result = classifyEditPromotion({
      request: 'Decrease the diameter of the lone horizontal bore from 15mm to 10mm.',
      before: report(1_000_000, 20, [beforeHorizontal, hole(46, 0, 0, -31)]),
      after: report(1_000_000, 20, [correct, hole(46, 0, 0, -31)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('repairs a removal that removed fewer than the requested three holes', () => {
    const result = classifyEditPromotion({
      request: 'Remove these three holes.',
      before: report(1_000_000, 20, [hole(6, 0), hole(6, 10), hole(6, 20), hole(12, 30)]),
      after: report(1_001_000, 20, [hole(6, 10), hole(6, 20), hole(12, 30)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
    expect(result.reason).toContain('3');
  });

  it('accepts removing exactly the requested three holes', () => {
    const result = classifyEditPromotion({
      request: 'Remove these three holes.',
      before: report(1_000_000, 20, [hole(6, 0), hole(6, 10), hole(6, 20), hole(12, 30)]),
      after: report(1_001_000, 20, [hole(12, 30)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('rejects an edit in the opposite material direction', () => {
    const result = classifyEditPromotion({
      request: 'Add a 5 mm boss on the top face.',
      before: report(1_000_000, 20),
      after: report(998_000, 21),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-direction' });
  });

  it('rejects a move that deletes the feature', () => {
    const result = classifyEditPromotion({
      request: 'Move the 5 mm hole 10 mm to the left.',
      before: report(1_000_000, 20, [hole(5, 10, 0)]),
      after: report(1_000_000, 20, []),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });

  it('accepts a pure move when the hole moved and the volume is preserved', () => {
    const result = classifyEditPromotion({
      request: 'Move the 5 mm hole 10 mm to the left.',
      before: report(1_000_000, 20, [hole(5, 30, 0)], 100),
      after: report(1_000_000, 20, [hole(5, 20, 0)], 100),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'move-check' });
    expect(result.holeChangeMm).toBeCloseTo(10, 6);
  });

  it('rejects filling a hole without a decrease in hole count', () => {
    const result = classifyEditPromotion({
      request: 'Fill the three holes on the front face.',
      before: report(1_000_000, 20, [hole(6), hole(6), hole(12)]),
      after: report(1_003_000, 20, [hole(6), hole(6), hole(12)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });

  it('keeps a face-count-only edit below the volume tolerance', () => {
    const result = classifyEditPromotion({
      request: 'Replace the four mounting holes with a single central hole.',
      before: report(1_000_000, 20, [hole(6), hole(6), hole(6), hole(6)]),
      after: report(1_000_000, 21, [hole(6)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
    expect(result.faceDelta).toBe(1);
  });

  it('never accepts a compound or multi-solid result', () => {
    const before = report(1_000_000, 20);
    const after = report(1_000_000, 20);
    after.solidCount = 2;
    const result = classifyEditPromotion({ request: 'Add a rib.', before, after });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });
});

describe('unintended translation (#1402)', () => {
  const holes = [hole(10, 20, 20), hole(10, 80, 20), hole(46, 50, 50)];

  it('rejects a chamfer that also moved the whole part', () => {
    const result = classifyEditPromotion({
      request: 'Add a 2mm chamfer to the top outer edges.',
      before: report(1_000_000, 20, holes),
      after: shifted(report(999_000, 24, holes), 10),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'unintended-move' });
    expect(result.reason).toContain('10.000');
  });

  it('rejects a translated part without holes', () => {
    const result = classifyEditPromotion({
      request: 'Add a 2mm chamfer to the top outer edges.',
      before: report(1_000_000, 20),
      after: shifted(report(999_000, 24), 0, -5, 3),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'unintended-move' });
  });

  it('rejects a part translated along the axes of all its holes', () => {
    // Every hole axis line is unchanged by a shift along Z, so the hole match
    // alone cannot show the move; the bbox shift does.
    const result = classifyEditPromotion({
      request: 'Add a 2mm chamfer to the top outer edges.',
      before: report(1_000_000, 20, holes),
      after: shifted(report(999_000, 24, holes), 0, 0, 3),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'unintended-move' });
  });

  it('rejects a translated part whose bore was also resized', () => {
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 50mm.',
      before: report(1_000_000, 20, holes),
      after: shifted(report(998_000, 20, [hole(10, 20, 20), hole(10, 80, 20), hole(50, 50, 50)]), 10),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'unintended-move' });
  });

  it('still accepts a lengthen that grows the bbox on one side', () => {
    const before = report(1_000_000, 20, holes);
    const after = report(1_050_000, 20, holes);
    after.solids[0].bboxExact = { min: [0, 0, 0], max: [105, 100, 100] };
    const result = classifyEditPromotion({ request: 'Extend the plate by 5mm in +X.', before, after });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('still accepts a requested move of the whole part', () => {
    const result = classifyEditPromotion({
      request: 'Move the part 10mm along X.',
      before: report(1_000_000, 20, holes),
      after: shifted(report(1_000_000, 20, holes), 10),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'move-check' });
  });

  it('does not read one moved hole as a moved part', () => {
    const result = classifyEditPromotion({
      request: 'Move the central bore 10mm along X.',
      before: report(1_000_000, 20, holes),
      after: report(1_000_000, 20, [hole(10, 20, 20), hole(10, 80, 20), hole(46, 60, 50)]),
    });
    // The bbox did not move, so this is a feature edit, not a moved part.
    expect(result.status).toBe('accepted');
    expect(result.classification).not.toBe('unintended-move');
  });
});

describe('extend toward a signed axis (#1402)', () => {
  const holes = [hole(10, 20, 20), hole(46, 50, 50)];
  function extended(min: [number, number, number], max: [number, number, number], volume = 1_050_000) {
    const after = report(volume, 20, holes);
    after.solids[0].bboxExact = { min, max };
    return after;
  }

  it('rejects an extension that grew the part on the opposite side', () => {
    const result = classifyEditPromotion({
      request: 'Extend the plate by 5mm in +X.',
      before: report(1_000_000, 20, holes),
      after: extended([-5, 0, 0], [100, 100, 100]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-direction' });
    expect(result.reason).toContain('-X side');
  });

  it('rejects an extension that grew the part further than requested', () => {
    const result = classifyEditPromotion({
      request: 'Extend the plate by 5mm in +X.',
      before: report(1_000_000, 20, holes),
      after: extended([0, 0, 0], [110, 100, 100], 1_100_000),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude' });
    expect(result.reason).toContain('10.000');
  });

  it('accepts the requested extension on the requested side', () => {
    const result = classifyEditPromotion({
      request: 'Lengthen the base along -Z by 4 mm.',
      before: report(1_000_000, 20, holes),
      after: extended([0, 0, -4], [100, 100, 100], 1_040_000),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('accepts an extended boss that stays inside the part bounds', () => {
    // The boss face sat below the top, so the bbox grows less than 5 mm.
    const result = classifyEditPromotion({
      request: 'Extend the boss by 5mm in +Z.',
      before: report(1_000_000, 20, holes),
      after: extended([0, 0, 0], [100, 100, 102], 1_002_000),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('does not check the side when the request names no signed axis', () => {
    expect(parseEditIntent('Extend the plate by 5mm.').targetExtent).toBeUndefined();
    expect(parseEditIntent('Extend the rib by 5mm in +X and shorten the tab in -Y.').targetExtent).toBeUndefined();
    expect(parseEditIntent('Extend the plate by 5mm in +X.').targetExtent).toEqual({ axis: 0, sign: 1, mm: 5 });
  });
});

describe('local face move (#1402)', () => {
  const holes = [hole(10, 20, 20), hole(46, 50, 50)];
  function grown(min: [number, number, number], max: [number, number, number], volume: number) {
    const after = report(volume, 20, holes);
    after.solids[0].bboxExact = { min, max };
    return after;
  }

  it('accepts a moved top face that changes the volume', () => {
    // Before this fix, "move" made the request a rigid feature move, so the
    // volume change failed it as wrong-topology.
    const result = classifyEditPromotion({
      request: 'Move the top face up by 3 mm.',
      before: report(1_000_000, 20, holes),
      after: grown([0, 0, 0], [100, 100, 103], 1_030_000),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('accepts a face moved toward a signed axis by the requested distance', () => {
    const result = classifyEditPromotion({
      request: 'Move the right face of the base 5mm in +X.',
      before: report(1_000_000, 20, holes),
      after: grown([0, 0, 0], [105, 100, 100], 1_050_000),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('rejects a face moved further than requested', () => {
    const result = classifyEditPromotion({
      request: 'Move the right face of the base 5mm in +X.',
      before: report(1_000_000, 20, holes),
      after: grown([0, 0, 0], [110, 100, 100], 1_100_000),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude' });
  });

  it('rejects a face move that grew the opposite side', () => {
    const result = classifyEditPromotion({
      request: 'Move the right face of the base 5mm in +X.',
      before: report(1_000_000, 20, holes),
      after: grown([-5, 0, 0], [100, 100, 100], 1_050_000),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-direction' });
  });

  it('rejects a face move that translated the whole part instead', () => {
    const result = classifyEditPromotion({
      request: 'Move the top face up by 3 mm.',
      before: report(1_000_000, 20, holes),
      after: shifted(report(1_000_000, 20, holes), 0, 0, 3),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'unintended-move' });
  });

  it('still reads a feature located on a face as a feature move', () => {
    expect(parseEditIntent('Move the slot on the top face 5 mm in +X.')).toMatchObject({
      moveOnly: true,
      offsetsFaces: false,
    });
    expect(parseEditIntent('Shift the slot 4 mm toward +Y.')).toMatchObject({ moveOnly: true });
    expect(parseEditIntent('Offset the top face of the boss by 2 mm.')).toMatchObject({
      moveOnly: false,
      offsetsFaces: true,
    });
  });
});

describe('remote hole change (#1402)', () => {
  const holes = [hole(10, 20, 20), hole(10, 80, 20), hole(46, 50, 50)];

  it('rejects a chamfer edit that also deleted a remote hole', () => {
    // Filling the 10 mm hole adds ~1571 mm³; the chamfer removes more, so the
    // net volume still falls in the requested direction.
    const result = classifyEditPromotion({
      request: 'Add a 2mm chamfer to the top outer edges.',
      before: report(1_000_000, 20, holes),
      after: report(997_000, 23, [hole(10, 20, 20), hole(46, 50, 50)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
    expect(result.reason).toContain('did not name');
  });

  it('rejects a fillet edit that also resized a remote hole', () => {
    const result = classifyEditPromotion({
      request: 'Add a 3mm fillet to the vertical outer edges.',
      before: report(1_000_000, 20, holes),
      after: report(999_500, 24, [hole(12, 20, 20), hole(10, 80, 20), hole(46, 50, 50)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });

  it('rejects a pocket edit that moved a remote hole', () => {
    const result = classifyEditPromotion({
      request: 'Cut a 5mm deep rectangular pocket in the top face.',
      before: report(1_000_000, 20, holes),
      after: report(990_000, 25, [hole(10, 20, 30), hole(10, 80, 20), hole(46, 50, 50)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });

  it('accepts a chamfer edit that keeps every hole', () => {
    const result = classifyEditPromotion({
      request: 'Add a 2mm chamfer to the top outer edges.',
      before: report(1_000_000, 20, holes),
      after: report(999_000, 24, holes),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('accepts a pocket that shortens a through hole without moving it', () => {
    // The pocket floor cuts the top of the hole, so its depth changes; the
    // axis and diameter stay, so the hole is the same feature.
    const after = holes.map((h, i) => (i === 0 ? { ...h, depthMm: 15 } : h));
    const result = classifyEditPromotion({
      request: 'Cut a 5mm deep rectangular pocket in the top face.',
      before: report(1_000_000, 20, holes),
      after: report(990_000, 25, after),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('accepts a slot edit that adds a new round void and keeps the holes', () => {
    const result = classifyEditPromotion({
      request: 'Cut a 6mm wide slot through the flange.',
      before: report(1_000_000, 20, holes),
      after: report(995_000, 26, [...holes, hole(6, 70, 70)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('accepts a healed import whose hole positions differ by tolerance noise', () => {
    const noisy = [hole(10.02, 20.03, 20), hole(10, 80, 19.97), hole(46.01, 50, 50)];
    const result = classifyEditPromotion({
      request: 'Add a 2mm chamfer to the top outer edges.',
      before: report(1_000_000, 20, holes),
      after: report(999_000, 24, noisy),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });
});

describe('hole enlargement keeps unrelated holes (#1402)', () => {
  const request = 'Increase the diameter of the central bore to 310mm.';
  const holes = [hole(188, 50, 50), hole(298, 50, 50), hole(8, 10, 10), hole(8, 90, 10)];
  const enlarged = (rest: CylindricalHole[]) => [hole(188, 50, 50), hole(310, 50, 50), ...rest];

  it('accepts a bore enlargement that keeps every other hole', () => {
    const result = classifyEditPromotion({
      request,
      before: report(1_000_000, 20, holes),
      after: report(998_000, 20, enlarged([hole(8, 10, 10), hole(8, 90, 10)])),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('rejects a bore enlargement that also deleted a remote hole', () => {
    const result = classifyEditPromotion({
      request,
      before: report(1_000_000, 20, holes),
      after: report(998_000, 19, enlarged([hole(8, 10, 10)])),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
    expect(result.reason).toContain('4 → 3');
  });

  it('rejects a bore enlargement that also resized a remote hole', () => {
    const result = classifyEditPromotion({
      request,
      before: report(1_000_000, 20, holes),
      after: report(998_000, 20, enlarged([hole(8, 10, 10), hole(12, 90, 10)])),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
    expect(result.reason).toContain('another hole was changed');
  });

  it('rejects a bore enlargement that also moved a remote hole', () => {
    const result = classifyEditPromotion({
      request,
      before: report(1_000_000, 20, holes),
      after: report(998_000, 20, enlarged([hole(8, 10, 10), hole(8, 70, 10)])),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
    expect(result.reason).toContain('another hole was changed');
  });

  it('rejects a bore enlargement that also enlarged the coaxial 188 mm bore', () => {
    const result = classifyEditPromotion({
      request,
      before: report(1_000_000, 20, holes),
      after: report(998_000, 20, [hole(310, 50, 50), hole(310, 50, 50), hole(8, 10, 10), hole(8, 90, 10)]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
  });
});

describe('parseEditIntent', () => {
  it('reads a bore enlargement as material removal', () => {
    expect(parseEditIntent('Increase the diameter of the central bore to 310mm.').direction).toBe('decrease');
  });

  it('reads a boss enlargement as material addition', () => {
    expect(parseEditIntent('Increase the boss diameter to 40 mm.').direction).toBe('increase');
  });

  it('reads the resized feature from the object, not a bore named in its description', () => {
    expect(
      parseEditIntent('Increase the length of the square boss with rounded corners and a central bore by 10mm.')
        .direction,
    ).toBe('increase');
    expect(
      parseEditIntent(
        'Increase the length of the only boss in the model with no fillet on its mounting face such that it is flush with the next nearest mounting hole.',
      ).direction,
    ).toBe('increase');
    expect(parseEditIntent("Increase the boss's bore diameter to 12 mm.").direction).toBe('decrease');
    expect(parseEditIntent('Shorten the slot next to the rib by 5 mm.').direction).toBe('increase');
    expect(parseEditIntent('Reduce the rib height near the slot by 2 mm.').direction).toBe('decrease');
  });

  it('leaves the direction open when walls are moved inward or outward', () => {
    expect(
      parseEditIntent(
        'For each of the four non-circular pockets on the +X side of the central bore, bring their walls (faces with long axis along Y) inward by 6mm.',
      ).direction,
    ).toBe('any');
  });

  // Task 201 pilot, 15 Nov 2026 (#1402): a broad +X/-X offsetFaces passed
  // validity and was accepted. Measured: volume 2,544,478.1527 → 2,597,484.5516
  // mm³, faces 435 → 453, holes 28 → 28, same bbox.
  const WALL_REQUEST =
    'For each of the four non-circular pockets on the +X side of the central bore, bring their walls (faces with long axis along Y) inward by 6mm.';
  const holes28 = Array.from({ length: 28 }, (_, i) => hole(6, i * 3));

  it('does not accept a wall offset that added faces (task 201)', () => {
    const result = classifyEditPromotion({
      request: WALL_REQUEST,
      before: report(2_544_478.1527, 435, holes28),
      after: report(2_597_484.5516, 453, holes28),
    });
    expect(result).toMatchObject({ status: 'unknown', classification: 'locality-unverified', faceDelta: 18 });
    expect(result.reason).toContain('faces +18');
  });

  it('accepts a wall offset that keeps the face and hole topology', () => {
    const result = classifyEditPromotion({
      request: WALL_REQUEST,
      before: report(2_544_478.1527, 435, holes28),
      after: report(2_530_000, 435, holes28),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('returns unknown, not failed, when a wall offset changes the hole count (task 201)', () => {
    const result = classifyEditPromotion({
      request: WALL_REQUEST,
      before: report(2_544_478.1527, 435, holes28),
      after: report(2_597_484.5516, 453, holes28.slice(1)),
    });
    expect(result).toMatchObject({ status: 'unknown', classification: 'locality-unverified' });
    expect(result.reason).toContain('holes 28 → 27');
  });

  // #1402: "on the +X side of the central bore" only locates the pockets; it
  // is not a request to edit the bore.
  it('does not read a hole that only locates the edited feature as a hole edit', () => {
    expect(parseEditIntent(WALL_REQUEST)).toMatchObject({
      mentionsHoles: false,
      mentionsTopology: true,
      expectsHoleDelta: 'any',
    });
    expect(parseEditIntent('Add two ribs beside the central bore.')).toMatchObject({
      direction: 'increase',
      mentionsHoles: false,
      expectsHoleDelta: 'any',
    });
    expect(parseEditIntent('Add two ribs beside the central bore.').targetHoleCountDelta).toBeUndefined();
    expect(parseEditIntent('Remove the two ribs next to the central bore.')).toMatchObject({
      direction: 'any',
      expectsHoleDelta: 'any',
    });
    expect(parseEditIntent('Move the slot next to the bore 5 mm along +X.')).toMatchObject({
      moveOnly: true,
      direction: 'neutral',
    });
    expect(parseEditIntent('Increase the horizontal hole near the central bore to 12 mm.')).toMatchObject({
      mentionsHoles: true,
      targetHoleDiameterMm: 12,
      targetHoleSelector: 'horizontal',
    });
    // The named bore is still the edited feature.
    expect(parseEditIntent('Increase the diameter of the central bore to 310 mm.')).toMatchObject({
      mentionsHoles: true,
      targetHoleDiameterMm: 310,
      targetHoleSelector: 'central',
    });
    expect(parseEditIntent('Drill four holes around the central bore.')).toMatchObject({
      expectsHoleDelta: 'more',
      targetHoleCountDelta: 4,
    });
  });

  it('accepts two ribs added beside the bore with the holes unchanged', () => {
    const result = classifyEditPromotion({
      request: 'Add two ribs beside the central bore.',
      before: report(1_000_000, 40, holes28),
      after: report(1_004_000, 52, holes28),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('keeps added faces acceptable when the request is not a wall offset', () => {
    expect(parseEditIntent(WALL_REQUEST).offsetsFaces).toBe(true);
    expect(parseEditIntent('Add a 2mm chamfer to the top edges.').offsetsFaces).toBe(false);
    const result = classifyEditPromotion({
      request: 'Add a 2mm chamfer to the top edges.',
      before: report(1_000_000, 20),
      after: report(999_000, 24),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  // 100 mm cube, one 5 mm convex fillet on a 100 mm edge: 7 faces. Removing
  // it adds (1 - pi/4) * 5^2 * 100 = 536.5 mm^3 and leaves 6 faces.
  const FILLETED = 1_000_000 - 536.5;
  const withBox = (source: StepInspectReport, min: [number, number, number], max: [number, number, number]) => ({
    ...source,
    solids: source.solids.map((solid) => ({ ...solid, bboxExact: { min, max } })),
  });

  it('accepts a narrow fillet removal that restores the sharp edge', () => {
    const result = classifyEditPromotion({
      request: 'Remove the 5mm fillet from the top +X edge.',
      before: report(FILLETED, 7, [hole(10, 20, 20)]),
      after: report(1_000_000, 6, [hole(10, 20, 20)]),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited', faceDelta: -1 });
  });

  it('rejects a broad cutter that removed the adjacent wall (bbox shrank)', () => {
    // The fillet face is gone, but a 10 mm slab of the +X wall went with it:
    // 13x the material of the fillet itself.
    const result = classifyEditPromotion({
      request: 'Remove the 5mm fillet from the top +X edge.',
      before: report(FILLETED, 7, [hole(10, 20, 20)]),
      after: withBox(report(1_000_000 - 7_000, 6, [hole(10, 20, 20)]), [0, 0, 0], [90, 100, 100]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-topology' });
    expect(result.reason).toContain('moved inward by 10.000 mm');
  });

  it('rejects a blend removal that grew the part beyond the blend size', () => {
    const result = classifyEditPromotion({
      request: 'Remove the 5mm fillet from the top +X edge.',
      before: report(FILLETED, 7),
      after: withBox(report(1_080_000, 6), [0, 0, 0], [108, 100, 100]),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude' });
  });

  it('accepts a blend removal that grows a side by no more than the blend size', () => {
    const result = classifyEditPromotion({
      request: 'Remove the 5mm fillet from the top +X edge.',
      before: withBox(report(FILLETED, 7), [0, 0, 0], [95, 100, 100]),
      after: report(1_000_000, 6),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('does not accept a blend removal that added faces (annular cutter)', () => {
    // An annular cutter around the boss leaves a groove floor and two walls.
    const result = classifyEditPromotion({
      request: 'Remove the fillet from the outer diameter of the central boss on the +Z side of the part.',
      before: report(FILLETED, 7),
      after: report(1_000_000 - 7_000, 9),
    });
    expect(result).toMatchObject({ status: 'unknown', classification: 'locality-unverified', faceDelta: 2 });
  });

  it('reads only a plain blend removal as a blend removal', () => {
    expect(parseEditIntent('Remove the 5mm fillet from the top +X edge.')).toMatchObject({
      removesBlend: true,
      blendSizeMm: 5,
    });
    expect(parseEditIntent('Remove the chamfers on the outer edges.')).toMatchObject({ removesBlend: true });
    expect(parseEditIntent('Remove the chamfer on the central bore.').removesBlend).toBe(false);
    expect(parseEditIntent('Remove the fillet and add a 2mm chamfer.').removesBlend).toBe(false);
    expect(parseEditIntent('Change the chamfers to 3mm fillets.').removesBlend).toBe(false);
  });

  it('leaves the direction open when a fillet is removed from a named feature', () => {
    expect(
      parseEditIntent('Remove the fillet from the outer diameter of the central boss on the +Z side of the part.')
        .direction,
    ).toBe('any');
  });

  it('reads a fill request as material addition and fewer holes', () => {
    expect(parseEditIntent('Fill the three holes on the front face.')).toMatchObject({
      direction: 'increase',
      expectsHoleDelta: 'fewer',
    });
  });

  it('extracts the count and the diameter targets from the request', () => {
    expect(parseEditIntent('Remove these three holes.')).toMatchObject({
      targetHoleCountDelta: -3,
    });
    expect(parseEditIntent('Increase the diameter of the central bore to 310mm.')).toMatchObject({
      targetHoleDiameterMm: 310,
      targetHoleSelector: 'central',
    });
    expect(parseEditIntent('Decrease the diameter of the lone horizontal bore from 15mm to 10mm.')).toMatchObject({
      sourceHoleDiameterMm: 15,
      targetHoleDiameterMm: 10,
      targetHoleSelector: 'horizontal',
    });
  });
});
