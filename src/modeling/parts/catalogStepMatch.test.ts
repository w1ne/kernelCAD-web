// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sample check that the generated catalog STEPs keep the family table's
// geometry. The catalog is gitignored and built by `pretest`/`npm run
// generate:parts`; when it is present, each sampled record is inspected and
// its bounding box compared with the table dims. This is what catches a
// generator that drifts from the in-memory envelope (it caught none today,
// but the flat-head frustum change is exactly the kind of edit it guards).
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { inspectStepBuffer } from '../../kernel/import/inspectStep';
import {
  BHCS_HEAD,
  FLATHEAD_HEAD,
  FLAT_WASHER,
  HEX_BOLT_HEAD,
  HEX_NUT,
  LOCK_NUT,
  LOCK_WASHER,
  SHCS_HEAD,
  resolvePart,
} from './familyTable';

interface Sample {
  family: string;
  thread: string;
  lengthMm?: number;
  /** Expected bbox x size (head/flange/outer diameter), mm. */
  zSize: number;
  xSize: number;
}

function screwSamples(): Sample[] {
  return [
    { family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 10, zSize: SHCS_HEAD.M5!.K + 10, xSize: SHCS_HEAD.M5!.D },
    { family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 50, zSize: SHCS_HEAD.M5!.K + 50, xSize: SHCS_HEAD.M5!.D },
    { family: 'button-head-cap-screw', thread: 'M5', lengthMm: 6, zSize: BHCS_HEAD.M5!.K + 6, xSize: BHCS_HEAD.M5!.D },
    { family: 'button-head-cap-screw', thread: 'M5', lengthMm: 25, zSize: BHCS_HEAD.M5!.K + 25, xSize: BHCS_HEAD.M5!.D },
    // A countersunk head seats in its cone: rim on z = 0, tip at -length.
    { family: 'flat-head-countersunk', thread: 'M5', lengthMm: 8, zSize: 8, xSize: FLATHEAD_HEAD.M5!.D },
    { family: 'flat-head-countersunk', thread: 'M5', lengthMm: 25, zSize: 25, xSize: FLATHEAD_HEAD.M5!.D },
    { family: 'socket-head-cap-screw', thread: 'M20', lengthMm: 200, zSize: SHCS_HEAD.M20!.K + 200, xSize: SHCS_HEAD.M20!.D },
    { family: 'hex-head-bolt', thread: 'M10', lengthMm: 40, zSize: HEX_BOLT_HEAD.M10!.K + 40, xSize: HEX_BOLT_HEAD.M10!.S },
    { family: 'set-screw', thread: 'M6', lengthMm: 20, zSize: 20, xSize: 6 },
    { family: 'threaded-rod', thread: 'M8', lengthMm: 1000, zSize: 1000, xSize: 8 },
  ];
}

function otherSamples(): Sample[] {
  return [
    { family: 'hex-nut', thread: 'M5', zSize: HEX_NUT.M5!.m, xSize: HEX_NUT.M5!.S },
    { family: 'lock-nut', thread: 'M5', zSize: LOCK_NUT.M5!.m, xSize: LOCK_NUT.M5!.S },
    { family: 'flat-washer', thread: 'M5', zSize: FLAT_WASHER.M5!.t, xSize: FLAT_WASHER.M5!.Dout },
    { family: 'lock-washer', thread: 'M5', zSize: LOCK_WASHER.M5!.t, xSize: LOCK_WASHER.M5!.Dout },
  ];
}

describe('catalog STEPs match the family table (sampled)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('every sampled fastener STEP is non-degenerate with the table dimensions', async () => {
    let checked = 0;
    for (const sample of [...screwSamples(), ...otherSamples()]) {
      const part = resolvePart({
        family: sample.family,
        thread: sample.thread,
        ...(sample.lengthMm !== undefined ? { lengthMm: sample.lengthMm } : {}),
      });
      const path = `assets/parts/${sample.family}/${part.id}.step`;
      if (!existsSync(path)) continue; // catalog not generated in this checkout
      const report = await inspectStepBuffer(readFileSync(path), part.id);
      const solid = report.solids[0];
      expect(solid, `${part.id} has no solid`).toBeDefined();
      expect(solid!.volumeMm3, part.id).toBeGreaterThan(1);
      const zSize = solid!.bboxExact.max[2] - solid!.bboxExact.min[2];
      const xSize = solid!.bboxExact.max[0] - solid!.bboxExact.min[0];
      // Large cylinders carry a little STEP bbox slack; keep the check relative.
      const within = (actual: number, expected: number): boolean =>
        Math.abs(actual - expected) <= Math.max(0.05, expected * 0.002);
      expect(within(zSize, sample.zSize), `${part.id} z size ${zSize}`).toBe(true);
      expect(within(xSize, sample.xSize), `${part.id} x size ${xSize}`).toBe(true);
      checked++;
    }
    if (checked > 0) expect(checked).toBe(screwSamples().length + otherSamples().length);
  }, 120000);
});
