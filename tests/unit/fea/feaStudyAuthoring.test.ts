// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-time contract for `shape.feaStudy({...})` and the FEA material
// table.
//
// The theme of every case here: a structural gate must fail LOUDLY at the
// declaration rather than quietly analysing something else. A misspelled
// material, a zero force, an empty load list — each of those could otherwise
// produce a green result that means nothing.

import { describe, it, expect } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { findFeaStudies, selectFeaStudy } from '../../../src/modeling/runtime/fea/findFeaStudies';
import {
  feaMaterialTable,
  FEA_MATERIAL_NAMES,
  resolveFeaMaterial,
} from '../../../src/kernel/fea/feaMaterials';
import { MATERIAL_CATALOG } from '../../../src/kinematic/beamMaterials';

async function capture(body: string) {
  return runScript({ code: body, fileName: '<fea-authoring>' });
}

const GOOD = `
const beam = box(100, 20, 10);
beam.feaStudy({
  name: 'bend',
  material: 'mild-steel',
  fixed: { atX: 0 },
  loads: [{ name: 'tip', faces: { atX: 100 }, force: [0, 0, -250] }],
  minSafetyFactor: 1.5,
});
return beam;
`;

describe('shape.feaStudy capture', () => {
  it('registers a virtual record bound to the shape it analyses', async () => {
    const run = await capture(GOOD);
    const studies = findFeaStudies(run.records);
    expect(studies).toHaveLength(1);
    expect(studies[0].metadata.name).toBe('bend');
    expect(studies[0].metadata.minSafetyFactor).toBe(1.5);
    expect(studies[0].metadata.virtual).toBe(true);
    // The bound shape is a real record in the same script.
    expect(run.records.some(r => r.id === studies[0].shapeId && r.kind !== 'feaStudy')).toBe(true);
  });

  it('normalizes load names and keeps the declared force as a total', async () => {
    const run = await capture(`
      const b = box(10, 10, 10);
      b.feaStudy({ material: 'pla', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [1, 2, -3] }] });
      return b;
    `);
    const s = findFeaStudies(run.records)[0];
    expect(s.metadata.name).toBe('study');
    expect(s.metadata.loads[0].name).toBe('load0');
    expect(s.metadata.loads[0].force).toEqual([1, 2, -3]);
  });

  it('selects the last declared study by default and by name on request', async () => {
    const run = await capture(`
      const b = box(10, 10, 10);
      b.feaStudy({ name: 'light', material: 'pla', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [0, 0, -1] }] });
      b.feaStudy({ name: 'heavy', material: 'pla', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [0, 0, -50] }] });
      return b;
    `);
    const studies = findFeaStudies(run.records);
    expect(studies).toHaveLength(2);
    expect(selectFeaStudy(studies, undefined)!.metadata.name).toBe('heavy');
    expect(selectFeaStudy(studies, 'light')!.metadata.name).toBe('light');
    expect(selectFeaStudy(studies, 'nope')).toBeUndefined();
  });

  it('rejects an unknown material and names every valid grade', async () => {
    await expect(
      capture(`
        const b = box(10, 10, 10);
        b.feaStudy({ material: 'unobtainium', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [0, 0, -1] }] });
        return b;
      `),
    ).rejects.toThrow(/not a known FEA material grade.*mild-steel/s);
  });

  it('rejects an empty load list rather than reporting nothing', async () => {
    await expect(
      capture(`
        const b = box(10, 10, 10);
        b.feaStudy({ material: 'pla', fixed: { atZ: 0 }, loads: [] });
        return b;
      `),
    ).rejects.toThrow(/loads must be a non-empty array/);
  });

  it('rejects a zero force, which would report an infinite safety factor', async () => {
    await expect(
      capture(`
        const b = box(10, 10, 10);
        b.feaStudy({ material: 'pla', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [0, 0, 0] }] });
        return b;
      `),
    ).rejects.toThrow(/zero vector/);
  });

  it('rejects a non-positive minSafetyFactor', async () => {
    await expect(
      capture(`
        const b = box(10, 10, 10);
        b.feaStudy({ material: 'pla', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [0, 0, -1] }], minSafetyFactor: 0 });
        return b;
      `),
    ).rejects.toThrow(/minSafetyFactor must be a positive finite number/);
  });

  it('accepts explicit measured properties instead of a named grade', async () => {
    const run = await capture(`
      const b = box(10, 10, 10);
      b.feaStudy({ material: { E: 3100, nu: 0.35, yield: 42 }, fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [0, 0, -5] }] });
      return b;
    `);
    expect(findFeaStudies(run.records)[0].metadata.material).toEqual({ E: 3100, nu: 0.35, yield: 42 });
  });

  it('rejects an out-of-range Poisson ratio in explicit properties', async () => {
    await expect(
      capture(`
        const b = box(10, 10, 10);
        b.feaStudy({ material: { E: 3100, nu: 0.6, yield: 42 }, fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [0, 0, -5] }] });
        return b;
      `),
    ).rejects.toThrow(/Poisson's ratio in \(-1, 0\.5\)/);
  });
});

describe('FEA material table', () => {
  it('serves every documented grade', () => {
    expect(FEA_MATERIAL_NAMES).toEqual(['mild-steel', 'aluminum-6061', 'pla', 'petg', 'abs', 'nylon']);
  });

  it('reads E and yield LIVE from the bulk catalog rather than copying them', () => {
    const table = feaMaterialTable();
    expect(table['mild-steel'].E).toBe(MATERIAL_CATALOG.steel.youngsModulusPa / 1e6);
    expect(table['mild-steel'].yield).toBe(MATERIAL_CATALOG.steel.yieldStressPa / 1e6);
    expect(table['aluminum-6061'].E).toBe(MATERIAL_CATALOG.aluminum.youngsModulusPa / 1e6);
    expect(table['petg'].yield).toBe(MATERIAL_CATALOG.pet.yieldStressPa / 1e6);
  });

  it('declares its own numbers only for the grade with no catalog row', () => {
    const table = feaMaterialTable();
    expect(table.nylon).toEqual({ E: 1700, nu: 0.39, yield: 45 });
  });

  it('gives every grade a physically valid Poisson ratio in solver units', () => {
    for (const [name, props] of Object.entries(feaMaterialTable())) {
      expect(props.nu, `${name}.nu`).toBeGreaterThan(0);
      expect(props.nu, `${name}.nu`).toBeLessThan(0.5);
      // MPa, not Pa: a metal is thousands, not billions.
      expect(props.E, `${name}.E`).toBeLessThan(1e6);
      expect(props.yield, `${name}.yield`).toBeLessThan(1e4);
    }
  });

  it('points an unknown name at the valid list instead of guessing', () => {
    const r = resolveFeaMaterial('steel');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('mild-steel');
  });
});
