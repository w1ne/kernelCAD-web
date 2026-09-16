// tests/unit/mcp/tools/inspectBom.test.ts
//
// Unit tests for `inspect({ of: 'bom' })` — bill-of-materials extraction.
// Inline assembly: a patterned bracket (quantity from real instance
// counting), two catalog STEP fasteners of the same kind placed 4 times
// (quantity 4, purchased, grouped by catalog id not name), and one part with
// no declared material (honest gap, not a guessed mass).
import { describe, it, expect, beforeAll } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectBomTool } from '../../../../src/agent/mcp/tools/inspectBom';

const BOM_EXAMPLE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../examples/bom/panel-with-fasteners.kcad.ts',
);

const ASSEMBLY_CODE = `
const arm = assembly('demo');
for (let i = 0; i < 3; i++) {
  arm.part('bracket_' + i, box(10, 10, 4), { at: [i * 20, 0, 0], material: 'aluminum' });
}
arm.part('unmaterialed', box(5, 5, 5), { at: [0, 30, 0] });
for (let i = 0; i < 4; i++) {
  const screw = await lib.fetchPart('iso-4762-m2x4');
  arm.part('screw_' + i, screw, { at: [i * 5, 50, 0] });
}
return arm.model();
`;

beforeAll(async () => {
  const { initOcct } = await import('../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

describe("inspect({ of: 'bom' })", () => {
  it('groups the patterned bracket into one row with quantity 3', async () => {
    const r = await inspectBomTool({ code: ASSEMBLY_CODE });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const bracketRow = r.rows.find((row) => row.instancePaths.includes('bracket_0'));
    expect(bracketRow).toBeDefined();
    expect(bracketRow!.quantity).toBe(3);
    expect(bracketRow!.kind).toBe('fabricated');
    expect(bracketRow!.material).toBe('aluminum-6061');
    expect(bracketRow!.instancePaths).toEqual(['bracket_0', 'bracket_1', 'bracket_2']);
  }, 60000);

  it('groups the four catalog fasteners into one purchased row by catalog id, not name', async () => {
    const r = await inspectBomTool({ code: ASSEMBLY_CODE });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const screwRow = r.rows.find((row) => row.kind === 'purchased');
    expect(screwRow).toBeDefined();
    expect(screwRow!.quantity).toBe(4);
    expect(screwRow!.instancePaths).toEqual(['screw_0', 'screw_1', 'screw_2', 'screw_3']);
    expect(screwRow!.catalog?.id).toBe('iso-4762-m2x4');
    expect(screwRow!.catalog?.license).toBe('MIT');
  }, 60000);

  it('leaves mass null (not water-guessed) for a part with no material/density, and flags it', async () => {
    const r = await inspectBomTool({ code: ASSEMBLY_CODE });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const row = r.rows.find((rw) => rw.instancePaths.includes('unmaterialed'));
    expect(row).toBeDefined();
    expect(row!.material).toBeNull();
    expect(row!.massGPerUnit).toBeNull();
    expect(row!.massGTotal).toBeNull();
    expect(r.diagnostics.some((d) => d.code === 'bom.material.unassigned')).toBe(true);
  }, 60000);

  it('reports totals: real partCount, unique row count, and a partial (never-guessed) mass total', async () => {
    const r = await inspectBomTool({ code: ASSEMBLY_CODE });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.totals.partCount).toBe(3 + 1 + 4);
    expect(r.totals.uniquePartCount).toBe(3);
    expect(r.totals.totalMassG).not.toBeNull();
    const bracketRow = r.rows.find((row) => row.instancePaths.includes('bracket_0'))!;
    expect(r.totals.totalMassG).toBeCloseTo(bracketRow.massGTotal!, 3);
  }, 60000);

  it('fails closed with error when no assembly was captured', async () => {
    const r = await inspectBomTool({ code: 'return box(10, 10, 10);' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not ok');
    expect(r.error).toMatch(/no assembly/i);
  }, 60000);

  it('inspects examples/bom/panel-with-fasteners.kcad.ts using the local iso-4762-m2x4 catalog part', async () => {
    const r = await inspectBomTool({ file: BOM_EXAMPLE });
    if (!r.ok) throw new Error(r.error);
    expect(r.ok).toBe(true);
    const screwRow = r.rows.find((row) => row.kind === 'purchased');
    expect(screwRow).toBeDefined();
    expect(screwRow!.quantity).toBe(4);
    expect(screwRow!.catalog?.id).toBe('iso-4762-m2x4');
    expect(screwRow!.catalog?.license).toBe('MIT');
    expect(r.totals.partCount).toBe(9);
    expect(r.totals.uniquePartCount).toBe(4);
  }, 60000);

  it('reports the flat blank bbox for a bent sheet-metal part, not the folded body', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(50, 0).lineTo(50, 25).lineTo(0, 25).close();
      const blank = sheetMetal(s, { thickness: 3.175, kFactor: 0.38 });
      const bent = blank.bend({ atX: 25 }, 90, 3);
      const arm = assembly('sheet');
      arm.part('panel', bent, { material: 'mild-steel' });
      return arm.model();
    `;
    const r = await inspectBomTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const row = r.rows[0];
    expect(row.processHint).toBe('sheet-metal');
    const [minX, minY, minZ] = row.bboxMm.min;
    const [maxX, maxY, maxZ] = row.bboxMm.max;
    expect(maxX - minX).toBeCloseTo(50, 3);
    expect(maxY - minY).toBeCloseTo(25, 3);
    expect(maxZ - minZ).toBeCloseTo(3.175, 3);
    expect(minZ).toBeCloseTo(0, 3);
  }, 60000);

  it('splits identical geometry into separate rows when the declared density differs', async () => {
    const code = `
      const arm = assembly('mix');
      arm.part('alu_a', box(10, 10, 4), { at: [0, 0, 0], material: 'aluminum' });
      arm.part('alu_b', box(10, 10, 4), { at: [20, 0, 0], material: 'aluminum' });
      arm.part('steel', box(10, 10, 4), { at: [40, 0, 0], density: 7850 });
      arm.part('bare', box(10, 10, 4), { at: [60, 0, 0] });
      return arm.model();
    `;
    const r = await inspectBomTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows).toHaveLength(3);

    const alu = r.rows.find((row) => row.instancePaths.includes('alu_a'))!;
    expect(alu).toBeDefined();
    expect(alu.quantity).toBe(2);
    expect(alu.density).toBeCloseTo(2700, 6);
    expect(alu.instancePaths).toEqual(['alu_a', 'alu_b']);

    const steel = r.rows.find((row) => row.instancePaths.includes('steel'))!;
    expect(steel).toBeDefined();
    expect(steel.quantity).toBe(1);
    expect(steel.density).toBe(7850);
    // 10x10x4 mm = 0.4 cm^3; 0.4 * 7.85 g/cm^3 = 3.14 g
    expect(steel.massGPerUnit).toBeCloseTo(3.14, 3);

    const bare = r.rows.find((row) => row.instancePaths.includes('bare'))!;
    expect(bare).toBeDefined();
    expect(bare.quantity).toBe(1);
    expect(bare.massGPerUnit).toBeNull();
  }, 60000);

  it('flags a purchased part with no standard/upstream provenance', async () => {
    const code = `
      const arm = assembly('demo2');
      const part = await lib.fetchPart('heatset-m2-5-l3-8');
      arm.part('insert', part);
      return arm.model();
    `;
    const r = await inspectBomTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows[0].catalog?.vendor).toBeNull();
    expect(r.diagnostics.some((d) => d.code === 'bom.purchased.catalog-metadata-missing')).toBe(true);
  }, 60000);
});
