// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One rule for every interference consumer: an overlap is "touching" only
// when its shared region is thinner than CONTACT_THICKNESS_MM (coincident
// faces), never because its volume is small. The numbers below are the
// three real overlaps of the DRAW-01 4-servo drawing robot that the old
// 20 mm³ "contact-noise" cap reported as clean.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import {
  CONTACT_THICKNESS_MM,
  INTERPENETRATION_EPSILON_MM3,
  isActionableOverlap,
} from '../../../src/modeling/runtime/jointContactCap';
import { summarizeInterferencePairs } from '../../../src/modeling/runtime/interferenceClassification';
import { validateAssembly } from '../../../src/modeling/mates/validator';

describe('isActionableOverlap', () => {
  it('reports the DRAW-01 overlaps that the 20 mm³ cap hid', () => {
    // Volume and mean thickness (2·V/A of the BREP common solid), measured.
    expect(isActionableOverlap({ volumeMm3: 10.045, thicknessMm: 0.544 })).toBe(true); // outer arm / pencil
    expect(isActionableOverlap({ volumeMm3: 8.487, thicknessMm: 0.414 })).toBe(true); // head deck / cradle
    expect(isActionableOverlap({ volumeMm3: 0.0438, thicknessMm: 0.0241 })).toBe(true); // cradle / tie
  });

  it('treats coincident-face slivers as touching, at any volume', () => {
    expect(isActionableOverlap({ volumeMm3: 0 })).toBe(false);
    expect(isActionableOverlap({ volumeMm3: INTERPENETRATION_EPSILON_MM3 })).toBe(false);
    expect(isActionableOverlap({ volumeMm3: 50, thicknessMm: CONTACT_THICKNESS_MM / 2 })).toBe(false);
  });

  it('treats an overlap of unknown thickness as real', () => {
    expect(isActionableOverlap({ volumeMm3: 0.05 })).toBe(true);
    expect(isActionableOverlap({ volumeMm3: 0.05, thicknessMm: null })).toBe(true);
  });

  it('drives the validator and the review summary the same way', () => {
    const pairs = [
      { a: 'outer-arm', b: 'pencil', volumeMm3: 10.045, thicknessMm: 0.544 },
      { a: 'deck', b: 'cradle', volumeMm3: 0.0438, thicknessMm: 0.0241 },
      { a: 'base', b: 'plate', volumeMm3: 30, thicknessMm: 0.001 },
    ];
    const summary = summarizeInterferencePairs(pairs);
    expect(summary.actionableCount).toBe(2);
    expect(summary.contactNoiseCount).toBe(1);
    expect(summary.pairs.map((p) => p.volumeMm3)).toEqual([10.045, 0.0438, 30]);
    const v = validateAssembly({ records: [], interferencePairs: pairs });
    const flagged = v.diagnostics.filter((d) => d.code === 'assembly.interference.overlap');
    expect(flagged.map((d) => d.volumeMm3)).toEqual([10.045, 0.0438]);
  });
});

describe('detectInterferences — measured thickness on real BREPs', () => {
  beforeAll(async () => {
    await initOcct();
  });

  async function detect(parts: string) {
    const code = `
      const arm = assembly('rule');
      ${parts}
      return arm.model();
    `;
    const { checkInterference } = await import('../../../src/agent/script-runtime/checkInterference');
    const r = await checkInterference({ code, fileName: 'rule.kcad.ts' });
    return { ...r, summary: summarizeInterferencePairs(r.pairs) };
  }

  it('keeps flush-mounted 3 mm plates clean', async () => {
    const r = await detect(`
      arm.part('base', box(40, 40, 3, true));
      arm.part('top', box(40, 40, 3, true).translate(0, 0, 3));
      arm.part('side', box(3, 40, 20, true).translate(21.5, 0, 0));
      arm.part('screw', cylinder(1, 3, true).translate(0, 0, 4.5));
    `);
    expect(r.comparisonCount).toBeGreaterThan(0);
    expect(r.summary.actionableCount).toBe(0);
  });

  it('reports a 10 mm³ overlap between 3 mm plates', async () => {
    // 5 x 5 mm footprint, 0.4 mm deep: 10 mm³.
    const r = await detect(`
      arm.part('arm', box(40, 40, 3, true));
      arm.part('pencil', box(5, 5, 3, true).translate(17.5, 0, 2.6));
    `);
    expect(r.summary.actionableCount).toBe(1);
    expect(r.pairs[0].volumeMm3).toBeCloseTo(10, 3);
    expect(r.pairs[0].thicknessMm).toBeGreaterThan(CONTACT_THICKNESS_MM);
  });

  it('reports a 0.044 mm³ overlap', async () => {
    // 0.7 x 0.6 mm footprint, 0.105 mm deep: 0.0441 mm³.
    const r = await detect(`
      arm.part('cradle', box(20, 20, 3, true));
      arm.part('tie', box(0.7, 0.6, 2, true).translate(0, 0, 2.395));
    `);
    expect(r.summary.actionableCount).toBe(1);
    expect(r.pairs[0].volumeMm3).toBeCloseTo(0.0441, 4);
  });
});
