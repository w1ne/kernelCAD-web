// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Module 1, 20/40 teeth. The centre 30 mm and the ratio −1/2 are the pitch
// circles written out below, not values read back from the pair. The volume
// check poses the lowered solids with a rigid transform and measures the
// common solid itself. It does not call the tooth-profile sampler.
import { beforeAll, describe, expect, it } from 'vitest';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { Transform } from '../../../src/shared/runtime/se3';

/** Common volume above which this file calls a pose interference. */
const INTERFERENCE_MM3 = 1e-3;

function mesh(opts: Parameters<ReturnType<typeof createModelingApi>['spurGearPair']>[0]) {
  const session = new CaptureSession();
  return createModelingApi({ session }).spurGearPair(opts);
}

describe('spur gear pair tooth interference', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('is clear at 30 mm, measures the backlash, and interferes when the driven gear turns the wrong way', async () => {
    const pair = mesh({
      module: 1,
      teeth: 20,
      drivenTeeth: 40,
      faceWidth: 4,
      backlash: 0.05,
    });
    const report = await pair.toothInterference({
      cycleSamples: 4,
      wholeRevolution: true,
      revolutionSamples: 2,
    });
    expect(pair.centerDistanceMm).toBe((1 * 20 + 1 * 40) / 2);
    expect(pair.ratio).toBe(-20 / 40);
    expect(report.kind).toBe('geometry');
    expect(report.anyInterference).toBe(false);
    expect(report.note).toMatch(/not a tooth-strength/i);
    expect(report.samples.map((sample) => sample.driverDeg)).toEqual([0, 4.5, 9, 13.5]);
    for (const sample of [...report.samples, ...(report.revolutionSamples ?? [])]) {
      expect(sample.drivenDeg).toBeCloseTo((-20 / 40) * sample.driverDeg, 9);
      expect(sample.interferenceVolumeMm3).toBeLessThan(INTERFERENCE_MM3);
    }
    const sideGap = (0.05 / 2) * Math.cos((20 * Math.PI) / 180);
    expect(report.samples[0].clearanceMm).toBeCloseTo(sideGap, 3);
    expect(report.minClearanceMm).toBeGreaterThan(0.01);
    expect(report.minClearanceMm).toBeLessThan(0.05);
    expect(report.backlashReached).toBe(true);
    expect(report.backlashMm).toBeGreaterThan(0.04);
    expect(report.backlashMm).toBeLessThan(0.06);
    expect(report.samples[0].nearestToothPair.driver).toBe(0);
    expect([19, 20]).toContain(report.samples[0].nearestToothPair.driven);

    const driver = await pair.driver.lower() as OcctBackend;
    const driven = await pair.driven.lower() as OcctBackend;
    const driverBox = driver.boundingBox();
    const drivenBox = driven.boundingBox();
    const driverCentre = (driverBox.min[0] + driverBox.max[0]) / 2;
    const drivenCentre = (drivenBox.min[0] + drivenBox.max[0]) / 2;
    expect(drivenCentre - driverCentre).toBeCloseTo(30, 3);

    // Driver 9° with driven +4.5° is one driven tooth (9°) from the true mesh,
    // so that pose fits the next tooth. Half a driver tooth is not a whole
    // driven pitch: +2.25° is the opposite ratio and closes the flanks.
    const commonAt = (driverDeg: number, drivenDeg: number) => {
      const posedDriver = driver.located(Transform.rotationAroundPivot([0, 0, 1], driverDeg, [0, 0, 0]));
      const posedDriven = driven.located(Transform.rotationAroundPivot([0, 0, 1], drivenDeg, [30, 0, 0]));
      return posedDriver.intersectionVolume(posedDriven);
    };
    expect(commonAt(4.5, -2.25)).toBeLessThan(INTERFERENCE_MM3);
    expect(commonAt(4.5, 2.25)).toBeGreaterThan(0.1);
  }, 55_000);

  it('reports interference when the centre is 0.3 mm short', async () => {
    const pair = mesh({
      module: 1,
      teeth: 20,
      drivenTeeth: 40,
      faceWidth: 4,
      backlash: 0.05,
      centerDistance: 30 - 0.3,
    });
    const report = await pair.toothInterference({ cycleSamples: 2 });
    expect(report.anyInterference).toBe(true);
    expect(Math.max(...report.samples.map((sample) => sample.interferenceVolumeMm3))).toBeGreaterThan(0.5);
  }, 20_000);

  it('reports interference when the driven module does not match at 30 mm', async () => {
    const pair = mesh({
      module: 1,
      teeth: 20,
      drivenTeeth: 40,
      drivenModule: 1.25,
      faceWidth: 4,
      backlash: 0.05,
      centerDistance: 30,
    });
    const report = await pair.toothInterference({ cycleSamples: 2 });
    expect(report.anyInterference).toBe(true);
    expect(Math.max(...report.samples.map((sample) => sample.interferenceVolumeMm3))).toBeGreaterThan(INTERFERENCE_MM3);
  }, 20_000);
});
