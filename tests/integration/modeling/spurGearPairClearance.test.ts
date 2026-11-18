// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The volume floor is 0.001 mm³. These checks use real common solids on
// either side of that floor, and a mesh whose pitch-circle play is not the
// authored backlash. The analytic centre, the overlap volume, and the
// centre-opening increment are written here.
import { beforeAll, describe, expect, it } from 'vitest';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { brepExtremaClosestBetween, wrappedShape } from '../../../src/modeling/runtime/brepDistance';
import {
  SPUR_GEAR_INTERFERENCE_VOLUME_MM3,
  aggregateSpurClearance,
} from '../../../src/modeling/spurGearPairMath';

const SPAN_MM = 0.1;

function mesh(opts: Parameters<ReturnType<typeof createModelingApi>['spurGearPair']>[0]) {
  const session = new CaptureSession();
  return createModelingApi({ session }).spurGearPair(opts);
}

/** Axis-aligned overlap of thickness `thicknessMm` on a 0.1 mm × 0.1 mm patch. */
async function patchOverlap(thicknessMm: number): Promise<{ distanceMm: number; volumeMm3: number }> {
  const session = new CaptureSession();
  const api = createModelingApi({ session });
  const base = await api.box(10, 10, 10).lower() as OcctBackend;
  const slab = await api.box(1, SPAN_MM, SPAN_MM).translate(10 - thicknessMm, 4.95, 4.95).lower() as OcctBackend;
  const hit = brepExtremaClosestBetween(wrappedShape(base), wrappedShape(slab));
  if (hit === undefined) throw new Error('BREP distance between the overlap boxes failed');
  return { distanceMm: hit.distance, volumeMm3: base.intersectionVolume(slab) };
}

describe('spur gear clearance floor and measured backlash', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('classifies a real common volume just above and just below 0.001 mm³', async () => {
    const floor = SPUR_GEAR_INTERFERENCE_VOLUME_MM3;
    const aboveThickness = 0.11;
    const belowThickness = 0.09;
    const aboveAnalytic = SPAN_MM * SPAN_MM * aboveThickness;
    const belowAnalytic = SPAN_MM * SPAN_MM * belowThickness;
    expect(aboveAnalytic).toBeGreaterThan(floor);
    expect(belowAnalytic).toBeGreaterThan(0);
    expect(belowAnalytic).toBeLessThan(floor);

    const above = await patchOverlap(aboveThickness);
    const below = await patchOverlap(belowThickness);
    expect(above.distanceMm).toBe(0);
    expect(below.distanceMm).toBe(0);
    expect(above.volumeMm3).toBeCloseTo(aboveAnalytic, 6);
    expect(below.volumeMm3).toBeCloseTo(belowAnalytic, 6);
    expect(above.volumeMm3).toBeGreaterThan(floor);
    expect(below.volumeMm3).toBeGreaterThan(0);
    expect(below.volumeMm3).toBeLessThanOrEqual(floor);

    const high = aggregateSpurClearance([
      { clearanceMm: above.distanceMm, interferenceVolumeMm3: above.volumeMm3 },
    ]);
    expect(high.anyInterference).toBe(true);
    expect(high.minClearanceMm).toBe(0);

    const low = aggregateSpurClearance([
      { clearanceMm: below.distanceMm, interferenceVolumeMm3: below.volumeMm3 },
    ]);
    expect(low.anyInterference).toBe(false);
    expect(low.minClearanceMm).toBeNull();

    // Separated boxes: positive distance, no common volume.
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const base = await api.box(10, 10, 10).lower() as OcctBackend;
    const clear = await api.box(1, SPAN_MM, SPAN_MM).translate(10.2, 4.95, 4.95).lower() as OcctBackend;
    const gap = brepExtremaClosestBetween(wrappedShape(base), wrappedShape(clear));
    if (gap === undefined) throw new Error('BREP distance between the separated boxes failed');
    expect(gap.distance).toBeCloseTo(0.2, 6);
    expect(base.intersectionVolume(clear)).toBe(0);
    const open = aggregateSpurClearance([
      { clearanceMm: gap.distance, interferenceVolumeMm3: 0 },
    ]);
    expect(open.anyInterference).toBe(false);
    expect(open.minClearanceMm).toBeCloseTo(0.2, 6);
  }, 20_000);

  it('measures more pitch-circle play when the centre is opened past the authored backlash', async () => {
    const moduleMm = 1;
    const teeth = 20;
    const drivenTeeth = 40;
    const authoredMm = 0.05;
    const pressureDeg = 20;
    const centre = (moduleMm * teeth + moduleMm * drivenTeeth) / 2;
    const openedBy = 0.2;
    // Pitch-circle increment from opening an external pair, mm.
    const extra = 2 * openedBy * Math.tan((pressureDeg * Math.PI) / 180);
    expect(centre).toBe(30);
    expect(extra).toBeGreaterThan(0.14);

    const pair = mesh({
      module: moduleMm,
      teeth,
      drivenTeeth,
      faceWidth: 4,
      backlash: authoredMm,
      pressureAngle: pressureDeg,
      centerDistance: centre + openedBy,
    });
    const report = await pair.toothInterference({ cycleSamples: 2 });
    expect(report.interferenceVolumeFloorMm3).toBe(SPUR_GEAR_INTERFERENCE_VOLUME_MM3);
    expect(report.centerDistanceMm).toBe(centre + openedBy);
    expect(report.authoredBacklashMm).toBe(authoredMm);
    expect(report.backlashReached).toBe(true);
    // The standard-centre test allows two bisection steps around 0.05 mm.
    // This opening moves the free arc by about `extra`, so an echo of the
    // authored number fails.
    expect(report.backlashMm - report.authoredBacklashMm).toBeGreaterThan(extra * 0.4);
    expect(report.backlashMm).toBeGreaterThan(authoredMm + 0.02);
  }, 55_000);
});
