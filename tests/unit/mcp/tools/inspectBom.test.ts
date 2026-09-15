// tests/unit/mcp/tools/inspectBom.test.ts
//
// Unit tests for `inspect({ of: 'bom' })` — bill-of-materials extraction.
// Inline assembly: a patterned bracket (quantity from real instance
// counting), two catalog STEP fasteners of the same kind placed 4 times
// (quantity 4, purchased, grouped by catalog id not name), and one part with
// no declared material (honest gap, not a guessed mass).
import { describe, it, expect, beforeAll } from 'vitest';
import { inspectBomTool } from '../../../../src/agent/mcp/tools/inspectBom';

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
