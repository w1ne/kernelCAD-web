// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/lowering/stepExportUnit.test.ts
//
// Regression: the export tool and the kernelcad-mcp skill advertise the STEP
// option `unit?: 'mm' | 'cm' | 'in'`, but no STEP path read it, so an inch
// request silently wrote a millimetre file. The file must declare the asked
// unit with coordinates rescaled to it, and a reader that converts units must
// get the same millimetre part back.
import { describe, it, expect, beforeAll } from 'vitest';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { importStepAssembly } from '../../../src/kernel/import/stepAssemblyImport';
import type { StepAssemblySnapshot } from '../../../src/kernel/import/stepAssemblyTypes';

// 1 x 2 x 0.5 in.
const PLATE = `return box(25.4, 50.8, 12.7);`;

// Two placements of one pin: written as a product tree with instances.
const PINNED = `
  const pin = cylinder(8, 2);
  const asm = assembly('pinned_plate');
  asm.part('plate', box(40, 20, 4));
  asm.part('pin_left', pin, { at: [-12, 0, 4] });
  asm.part('pin_right', pin, { at: [12, 3, 4] });
  return asm.model();
`;

// Two different parts: written as a flat world-frame body list.
const FLAT = `
  const asm = assembly('stack');
  asm.part('base', box(40, 20, 4));
  asm.part('cap', box(10, 10, 6), { at: [5, 5, 4] });
  return asm.model();
`;

type Unit = 'mm' | 'cm' | 'in' | undefined;

async function exportStep(code: string, unit: Unit): Promise<string> {
  const result = await runAndExport({
    code,
    fileName: 'unit-plate.kcad.ts',
    format: 'step',
    ...(unit === undefined ? {} : { options: { format: 'step', unit } }),
  });
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return new TextDecoder().decode(result.bytes);
}

function declaredUnit(text: string): string {
  if (/CONVERSION_BASED_UNIT\s*\(\s*'INCH'/.test(text)) return 'in';
  if (/SI_UNIT\s*\(\s*\.CENTI\.\s*,\s*\.METRE\.\s*\)/.test(text)) return 'cm';
  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/.test(text)) return 'mm';
  return 'unknown';
}

/** Largest absolute 3D point coordinate written in the file. */
function maxCoordinate(text: string): number {
  const values = [...text.matchAll(/CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(([^)]*)\)/g)]
    .map((m) => m[1].split(',').map(Number))
    .filter((p) => p.length === 3)
    .flat();
  return Math.max(...values.map(Math.abs));
}

const reimport = (text: string): Promise<StepAssemblySnapshot> =>
  importStepAssembly(new TextEncoder().encode(text), 'unit.step');

describe('STEP export honours options.unit', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('writes a single body in inches and centimetres with the same mm part', async () => {
    for (const [unit, scale] of [['in', 1 / 25.4], ['cm', 0.1], ['mm', 1]] as const) {
      const text = await exportStep(PLATE, unit);
      expect(declaredUnit(text)).toBe(unit);
      expect(maxCoordinate(text)).toBeCloseTo(50.8 * scale, 6);
      const [definition] = (await reimport(text)).definitions;
      expect(definition.volumeMm3).toBeCloseTo(25.4 * 50.8 * 12.7, 2);
      definition.boundsMm.max.forEach((v, axis) => expect(v).toBeCloseTo([25.4, 50.8, 12.7][axis], 4));
    }
  }, 120_000);

  it('scales product-tree instance placements, not only the geometry', async () => {
    const text = await exportStep(PINNED, 'in');
    expect(declaredUnit(text)).toBe('in');
    const snapshot = await reimport(text);
    const placed = (name: string) => {
      const o = snapshot.occurrences.find((item) => item.name === name)!;
      return [12, 13, 14].map((i) => Math.round(o.transform[i] * 1e6) / 1e6 + 0);
    };
    expect(placed('pin_left')).toEqual([-12, 0, 4]);
    expect(placed('pin_right')).toEqual([12, 3, 4]);
  }, 120_000);

  it('writes a flat multi-part scene in the asked unit', async () => {
    const text = await exportStep(FLAT, 'cm');
    expect(declaredUnit(text)).toBe('cm');
    const snapshot = await reimport(text);
    const total = snapshot.definitions.reduce((sum, d) => sum + d.volumeMm3, 0);
    expect(total).toBeCloseTo(40 * 20 * 4 + 10 * 10 * 6, 2);
  }, 120_000);

  it('returns to millimetres after an inch export when no unit is given', async () => {
    await exportStep(PLATE, 'in');
    const text = await exportStep(PLATE, undefined);
    expect(declaredUnit(text)).toBe('mm');
    expect(maxCoordinate(text)).toBeCloseTo(50.8, 6);
  }, 120_000);

  it('rejects an unsupported unit instead of writing millimetres', async () => {
    await expect(runAndExport({
      code: PLATE,
      fileName: 'unit-plate.kcad.ts',
      format: 'step',
      options: { format: 'step', unit: 'ft' } as never,
    })).rejects.toThrow(/STEP options\.unit must be 'mm', 'cm' or 'in'/);
  }, 120_000);
});
