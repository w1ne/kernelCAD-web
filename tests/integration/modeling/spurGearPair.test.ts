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
import {
  SPUR_GEAR_BACKLASH_SEARCH_STEPS,
  SPUR_GEAR_CLEARANCE_REFINEMENT_STEPS,
  SPUR_GEAR_INTERFERENCE_VOLUME_MM3,
  aggregateSpurClearance,
} from '../../../src/modeling/spurGearPairMath';
import type { SpurGearToothInterferenceReport } from '../../../src/modeling/spurGearPairReport';

/** Common volume above which this file calls a pose interference. */
const INTERFERENCE_MM3 = SPUR_GEAR_INTERFERENCE_VOLUME_MM3;

function mesh(opts: Parameters<ReturnType<typeof createModelingApi>['spurGearPair']>[0]) {
  const session = new CaptureSession();
  return createModelingApi({ session }).spurGearPair(opts);
}

type SpurPair = ReturnType<typeof mesh>;

function expectSampledClearance(report: SpurGearToothInterferenceReport): void {
  expect(report.kind).toBe('geometry');
  expect(report.sampleLimited).toBe(true);
  expect(report.clearanceScope).toBe('sampled-poses');
  expect(report.aggregateNote).toMatch(/do not prove clearance between samples/);
  expect(report.note).toMatch(/not a tooth-strength/i);
  expect(report.note).toMatch(/do not prove clearance between those poses/);
  expect(report.samples.map((sample) => sample.driverDeg)).toEqual([0, 4.5, 9, 13.5]);
  expect(report.samples.every((sample) => sample.sampledBy === 'uniform')).toBe(true);
  expect(report.uniformToothStepDeg).toBeCloseTo(4.5, 9);
  expect(report.refinementSteps).toBe(SPUR_GEAR_CLEARANCE_REFINEMENT_STEPS);
  expect(report.refinedSamples).toHaveLength(SPUR_GEAR_CLEARANCE_REFINEMENT_STEPS * 2);
  expect(report.refinedSamples.every((sample) => sample.sampledBy === 'refined')).toBe(true);
  expect(report.aggregatedPoseCount).toBe(
    report.samples.length + (report.revolutionSamples?.length ?? 0) + report.refinedSamples.length,
  );
  expect(report.unresolvedStepDeg).toBeGreaterThan(0);
  expect(report.unresolvedStepDeg).toBeLessThanOrEqual(
    report.uniformToothStepDeg / 2 ** report.refinementSteps + 1e-9,
  );
}

function aggregatedSamples(report: SpurGearToothInterferenceReport) {
  return [
    ...report.samples,
    ...(report.revolutionSamples ?? []),
    ...report.refinedSamples,
  ];
}

function expectVolumeFloor(report: SpurGearToothInterferenceReport): void {
  expect(report.interferenceVolumeFloorMm3).toBe(SPUR_GEAR_INTERFERENCE_VOLUME_MM3);
  expect(report.note).toMatch(/0\.001 mm³/);
  expect(report.aggregateNote).toMatch(/0\.001 mm³/);
  const sum = aggregateSpurClearance(aggregatedSamples(report));
  expect(report.anyInterference).toBe(sum.anyInterference);
  expect(report.maxInterferenceVolumeMm3).toBe(sum.maxInterferenceVolumeMm3);
  expect(report.minClearanceMm).toBe(sum.minClearanceMm);
  for (const sample of aggregatedSamples(report)) {
    expect(sample.interfering).toBe(sample.interferenceVolumeMm3 > report.interferenceVolumeFloorMm3);
  }
}

function expectAggregatedClear(report: SpurGearToothInterferenceReport): void {
  const aggregated = aggregatedSamples(report);
  for (const sample of aggregated) {
    expect(sample.drivenDeg).toBeCloseTo((-20 / 40) * sample.driverDeg, 9);
    expect(sample.interferenceVolumeMm3).toBeLessThan(INTERFERENCE_MM3);
  }
  expectVolumeFloor(report);
  expect(report.anyInterference).toBe(false);
  const gap = report.minClearanceMm;
  if (gap === null) throw new Error('clear mesh published no open gap');
  expect(gap).toBeCloseTo(Math.min(...aggregated.map((sample) => sample.clearanceMm)), 12);
  const sideGap = (0.05 / 2) * Math.cos((20 * Math.PI) / 180);
  expect(report.samples[0].clearanceMm).toBeCloseTo(sideGap, 3);
  expect(gap).toBeGreaterThan(0.01);
  expect(gap).toBeLessThan(0.05);
}

function expectBacklashStep(report: SpurGearToothInterferenceReport): void {
  expect(report.backlashReached).toBe(true);
  // One flank's remaining bracket. The sum of two flanks can sit up to two
  // steps off the authored circular backlash.
  const backlashStepMm = ((180 / 40) / 2 ** SPUR_GEAR_BACKLASH_SEARCH_STEPS) * (Math.PI / 180) * 20;
  expect(report.backlashStepMm).toBeCloseTo(backlashStepMm, 12);
  expect(Math.abs(report.backlashMm - 0.05)).toBeLessThanOrEqual(2 * backlashStepMm + 1e-12);
  expect(report.samples[0].nearestToothPair.driver).toBe(0);
  expect([19, 20]).toContain(report.samples[0].nearestToothPair.driven);
}

async function expectIndependentMesh(pair: SpurPair): Promise<void> {
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
    expectSampledClearance(report);
    expectAggregatedClear(report);
    expectBacklashStep(report);
    await expectIndependentMesh(pair);
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
    expect(report.sampleLimited).toBe(true);
    expect(report.clearanceScope).toBe('sampled-poses');
    expect(report.aggregateNote).toMatch(/already interferes/);
    expect(report.refinementSteps).toBe(0);
    expect(report.refinedSamples).toEqual([]);
    expectVolumeFloor(report);
    expect(report.anyInterference).toBe(true);
    expect(report.minClearanceMm).toBe(0);
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
    expect(report.sampleLimited).toBe(true);
    expect(report.refinementSteps).toBe(0);
    expectVolumeFloor(report);
    expect(report.anyInterference).toBe(true);
    expect(report.minClearanceMm).toBe(0);
    expect(Math.max(...report.samples.map((sample) => sample.interferenceVolumeMm3))).toBeGreaterThan(INTERFERENCE_MM3);
  }, 20_000);
});
