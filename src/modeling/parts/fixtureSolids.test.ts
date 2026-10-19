// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { resolvePart, type FixtureKind } from './familyTable';
import { fixtureSolid } from './fixtureSolids';

describe('fixture envelope solids', () => {
  beforeAll(async () => {
    await initOcct();
  });

  function bounds(family: string, thread: string, lengthMm?: number) {
    const part = resolvePart({ family, thread, ...(lengthMm !== undefined ? { lengthMm } : {}) });
    return fixtureSolid(part.kind as FixtureKind, part.dims ?? {}, part.nominalMm).boundingBox();
  }

  it('t-slot nut spans the neck and base below the table surface', () => {
    const b = bounds('t-slot-nut', 'M10');
    expect(b.min[2]).toBeCloseTo(-14, 6); // DIN 508 M10 h = 14 (k 7 + base 7)
    expect(b.max[2]).toBeCloseTo(0, 6);
    expect(b.max[1] - b.min[1]).toBeCloseTo(17.5, 6); // e min for the 12 mm slot
    expect(b.max[0] - b.min[0]).toBeCloseTo(26, 6);
  });

  it('clamping stud is a plain cylinder at the nominal diameter', () => {
    const b = bounds('clamping-stud', 'M8', 100);
    expect(b.min[2]).toBeCloseTo(0, 6);
    expect(b.max[2]).toBeCloseTo(100, 6);
    expect(b.max[0] - b.min[0]).toBeCloseTo(8, 6);
  });

  it('flange nut is as tall as its nut height and as wide as the collar', () => {
    const b = bounds('flange-nut', 'M10');
    expect(b.min[2]).toBeCloseTo(0, 6);
    expect(b.max[2]).toBeCloseTo(15, 6); // DIN 6331 M10 m = 15
    expect(b.max[0] - b.min[0]).toBeCloseTo(22, 6); // d1 = 22
  });

  it('strap clamp runs from the nose to the tail through the slot', () => {
    const b = bounds('strap-clamp', 'M10');
    expect(b.min[0]).toBeCloseTo(-48, 6);
    expect(b.max[0]).toBeCloseTo(125 - 48, 6);
    expect(b.max[2]).toBeCloseTo(12, 6);
  });

  it('step block rises one tread per step', () => {
    const b = bounds('step-block', 'M12');
    expect(b.min[2]).toBeCloseTo(0, 6);
    expect(b.max[2]).toBeCloseTo(60, 6); // 4 steps x 15 mm
    expect(b.max[1] - b.min[1]).toBeCloseTo(28, 6);
  });
});

describe('fixture catalog STEPs match the envelope', () => {
  // The generated catalog (assets/parts) is gitignored and built by `pretest`;
  // when it is present, prove the STEP and the in-memory envelope agree.
  beforeAll(async () => {
    await initOcct();
  });

  function expectedZ(family: string, dims: Record<string, number>, lengthMm: number): number {
    if (family === 't-slot-nut') return (dims.neckHeightMm ?? 0) + (dims.baseHeightMm ?? 0);
    if (family === 'clamping-stud') return lengthMm;
    if (family === 'flange-nut') return dims.heightMm ?? 0;
    if (family === 'strap-clamp') return dims.thicknessMm ?? 0;
    return (dims.steps ?? 0) * (dims.riseMm ?? 0);
  }

  it('emits one non-degenerate STEP per fixture variant with the stock z size', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { inspectStepBuffer } = await import('../../kernel/import/inspectStep');
    const { FIXTURE_FAMILY_NAMES, fixtureVariants } = await import('./familyTable');
    let checked = 0;
    for (const family of FIXTURE_FAMILY_NAMES) {
      for (const variant of fixtureVariants(family)) {
        const part = resolvePart({
          family,
          thread: variant.thread,
          ...(variant.lengthMm !== undefined ? { lengthMm: variant.lengthMm } : {}),
        });
        const path = `assets/parts/${family}/${part.id}.step`;
        if (!existsSync(path)) continue; // catalog not generated in this checkout
        const report = await inspectStepBuffer(readFileSync(path), part.id);
        const solid = report.solids[0];
        expect(solid, `${part.id} has no solid`).toBeDefined();
        expect(solid!.volumeMm3).toBeGreaterThan(1);
        const zSize = solid!.bboxExact.max[2] - solid!.bboxExact.min[2];
        expect(zSize, part.id).toBeCloseTo(expectedZ(family, part.dims ?? {}, part.lengthMm), 3);
        checked++;
      }
    }
    // A checkout without the generated catalog skips silently; one with it
    // must have checked every fixture.
    if (checked > 0) expect(checked).toBe(18);
  }, 120000);
});
