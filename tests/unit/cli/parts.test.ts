import { describe, it, expect, beforeAll } from 'vitest';
import { partsScript } from '../../../src/agent/cli/commands/parts';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TWO_BOX_ASSEMBLY = `
const arm = assembly('demo');
arm.part('a', box(10, 10, 10));
arm.part('b', box(10, 10, 10), { at: [20, 0, 0] });
return arm.model();
`;

describe('parts command', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns one stats entry per part with bbox, volume, area, triangles', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'asm.kcad.ts');
    writeFileSync(file, TWO_BOX_ASSEMBLY);
    const r = await partsScript({ file });
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(r.parts.map(p => p.name).sort()).toEqual(['a', 'b']);
    for (const p of r.parts) {
      expect(p.bbox.min).toHaveLength(3);
      expect(p.bbox.max).toHaveLength(3);
      for (const n of [...p.bbox.min, ...p.bbox.max]) expect(Number.isFinite(n)).toBe(true);
      expect(p.volumeMm3).toBeGreaterThan(0);
      expect(p.volumeMm3).toBeCloseTo(1000, 3); // 10x10x10 box
      expect(p.surfaceAreaMm2).toBeGreaterThan(0);
      expect(p.surfaceAreaMm2).toBeCloseTo(600, 3);
      expect(p.triangleCount).toBeGreaterThan(0);
    }
    // World-frame bbox: part b is placed 20mm along +X relative to a.
    const a = r.parts.find(p => p.name === 'a')!;
    const b = r.parts.find(p => p.name === 'b')!;
    expect(b.bbox.min[0] - a.bbox.min[0]).toBeCloseTo(20, 3);
    expect(b.bbox.max[0] - a.bbox.max[0]).toBeCloseTo(20, 3);
  });

  it('--json shape is stable: exact key set per entry', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'asm.kcad.ts');
    writeFileSync(file, TWO_BOX_ASSEMBLY);
    const r = await partsScript({ file });
    // `--json` serializes r.parts verbatim, so the JSON contract is the
    // key set of each entry after a stringify round-trip.
    const roundTripped = JSON.parse(JSON.stringify(r.parts)) as Record<string, unknown>[];
    for (const p of roundTripped) {
      expect(Object.keys(p).sort()).toEqual(
        ['bbox', 'name', 'surfaceAreaMm2', 'triangleCount', 'volumeMm3'],
      );
      expect(Object.keys(p.bbox as object).sort()).toEqual(['max', 'min']);
    }
  });

  it('non-assembly script exits non-zero with export.no-shape', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'plain.kcad.ts');
    writeFileSync(file, `return box(10, 10, 10);`);
    const r = await partsScript({ file });
    expect(r.exitCode).not.toBe(0);
    expect(r.diagnostics.some(d => d.code === 'export.no-shape')).toBe(true);
    expect(r.parts).toEqual([]);
  });
});
