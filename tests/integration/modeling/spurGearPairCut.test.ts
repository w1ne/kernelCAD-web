// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A small pair, so the discrete cut stays inside the file budget. The blank
// compared below is a tip cylinder built here, not the uncut involute.
import { beforeAll, describe, expect, it } from 'vitest';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

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
    const cutPair = await pair.withGeneratingCut({ samples: 4 });
    const teeth = 8;
    const centre = (1 * teeth + 1 * teeth) / 2;
    const d1 = (centre * teeth) / (teeth + teeth);
    const path = d1 + (1 * teeth) / 2 + 1;
    const theta = (2 * Math.PI * (teeth + teeth)) / (teeth * teeth * 4);
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
    const blank = OcctBackend.cylinder(3, (1 * teeth) / 2 + 1);
    expect(cut.volume()).toBeLessThan(blank.volume());
    const placedBlank = blank.rotate([0, 0, 1], 180 / teeth).translate(centre, 0, 0);
    const inCut = driver.intersectionVolume(cut);
    const inBlank = driver.intersectionVolume(placedBlank);
    expect(inCut).toBeLessThan(0.05);
    expect(inBlank).toBeGreaterThan(inCut + 0.1);
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
