// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A small pair, so the discrete cut stays inside the file budget. The blank
// and the reference envelope below are built in this file. They do not call
// the generating-cut implementation.
import { beforeAll, describe, expect, it } from 'vitest';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

const TEETH = 8;
const FACE = 3;
const SAMPLES = 4;
const CENTRE = (1 * TEETH + 1 * TEETH) / 2;
const ALIGN_DEG = 180 / TEETH;
const TIP_RADIUS = (1 * TEETH) / 2 + 1;
const CHIP_MM3 = 1e-6;

/** Driver pose in the driven blank's frame, from the external ratio. */
function driverInBlank(driver: OcctBackend, driverDeg: number): OcctBackend {
  const psiDeg = ALIGN_DEG + (-TEETH / TEETH) * driverDeg;
  const psi = (psiDeg * Math.PI) / 180;
  return driver.clone()
    .rotate([0, 0, 1], driverDeg - psiDeg)
    .translate(-CENTRE * Math.cos(psi), CENTRE * Math.sin(psi), 0);
}

function chipFrom(driver: OcctBackend, blank: OcctBackend, angles: readonly number[]): OcctBackend {
  let chip: OcctBackend | undefined;
  for (const driverDeg of angles) {
    const piece = driverInBlank(driver, driverDeg).intersect(blank.clone());
    if (piece.volume() <= CHIP_MM3) continue;
    chip = chip === undefined ? piece : chip.union(piece);
  }
  if (chip === undefined) throw new Error('reference cutter missed the tip blank');
  return chip;
}

/** Subtract `copies` tooth-pitch repeats of `chip` from a fresh tip blank. */
function envelope(blank: OcctBackend, chip: OcctBackend, copies: number): OcctBackend {
  let cut = blank.clone();
  const pitch = 360 / TEETH;
  for (let k = 0; k < copies; k += 1) {
    cut = cut.subtract(chip.clone().rotate([0, 0, 1], k * pitch));
  }
  return cut;
}

describe('discrete spur generating cut', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('removes driver metal from a tip blank and records the step sagitta', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const pair = api.spurGearPair({
      module: 1,
      teeth: 8,
      drivenTeeth: 8,
      faceWidth: 3,
      backlash: 0.05,
    });
    const cutPair = await pair.withGeneratingCut({ samples: SAMPLES });
    const teeth = TEETH;
    const centre = CENTRE;
    const d1 = (centre * teeth) / (teeth + teeth);
    const path = d1 + (1 * teeth) / 2 + 1;
    const theta = (2 * Math.PI * (teeth + teeth)) / (teeth * teeth * SAMPLES);
    const sagitta = path * (1 - Math.cos(theta / 2));
    expect(pair.generatingCut).toBeUndefined();
    expect(cutPair.driven).not.toBe(pair.driven);
    expect(cutPair.generatingCut).toMatchObject({
      samples: 4,
      method: 'discrete-union',
      cycle: 'one-driver-tooth',
      repetition: 'tooth-pitch',
    });
    expect(cutPair.generatingCut?.scallopMm).toBeCloseTo(sagitta, 12);
    expect(cutPair.generatingCut?.note).toMatch(/not a continuous generating cut/i);
    expect(session.getRecords().some((record) => record.kind === 'spurGearCut')).toBe(true);

    const driver = await cutPair.driver.lower() as OcctBackend;
    const cut = await cutPair.driven.lower() as OcctBackend;
    const blank = OcctBackend.cylinder(FACE, TIP_RADIUS);
    expect(cut.volume()).toBeLessThan(blank.volume());
    const placedBlank = blank.clone().rotate([0, 0, 1], ALIGN_DEG).translate(centre, 0, 0);
    const inCut = driver.intersectionVolume(cut);
    const inBlank = driver.intersectionVolume(placedBlank);
    expect(inCut).toBeLessThan(0.05);
    expect(inBlank).toBeGreaterThan(inCut + 0.1);

    const angles = Array.from({ length: SAMPLES }, (_, i) => (i * (360 / TEETH)) / SAMPLES);
    const fullChip = chipFrom(driver, blank, angles);
    const full = envelope(blank, fullChip, TEETH);
    const firstPoseOnly = envelope(blank, chipFrom(driver, blank, angles.slice(0, 1)), TEETH);
    const onePitchCopy = envelope(blank, fullChip, 1);
    const fullVolume = full.volume();
    const missingPosesMm3 = firstPoseOnly.volume() - fullVolume;
    const missingCopiesMm3 = onePitchCopy.volume() - fullVolume;
    expect(missingPosesMm3).toBeGreaterThan(0.5);
    expect(missingCopiesMm3).toBeGreaterThan(0.5);
    expect(Math.abs(cut.volume() - fullVolume)).toBeLessThan(Math.min(missingPosesMm3, missingCopiesMm3) / 10);
  }, 55_000);

  it('refuses a centre where the driver tip never enters the blank', async () => {
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const pair = api.spurGearPair({
      module: 1,
      teeth: 8,
      drivenTeeth: 8,
      faceWidth: 3,
      centerDistance: 40,
    });
    await expect(pair.withGeneratingCut({ samples: 3 })).rejects.toThrow(/tip/i);
    expect(session.getRecords().some((record) => record.kind === 'spurGearCut')).toBe(false);
  }, 20_000);
});
