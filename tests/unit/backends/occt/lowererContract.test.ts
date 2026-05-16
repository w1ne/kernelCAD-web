// tests/unit/backends/occt/lowererContract.test.ts
//
// Phase-3 structural sentinel: every lowerer that creates new faces (hole,
// holes, cutout) must produce result lineage entries carrying the slice-2
// fields (labelName + snapshot + featureId + featureKind). Acts as a
// regression guard for future feature-kind additions: copy the slice-1
// pattern in your lowerer and this test suite will validate the contract.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';

async function lowerScript(code: string): Promise<OcctBackend> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return r.shapes.get(last.id) as OcctBackend;
}

function lineagesWithLabelName(shape: OcctBackend, label: string) {
  const map = shape.historyMap;
  if (!map) return [];
  const out = [];
  for (const [hash, lineage] of map.entries()) {
    if (lineage.labelName === label) out.push({ hash, lineage });
  }
  return out;
}

describe('lowerer contract — slice-2 lineage fields populated', () => {
  beforeAll(async () => { await initOcct(); });

  it('hole lowerer writes labelName + snapshot + featureId + featureKind="hole" on the bore wall', async () => {
    const shape = await lowerScript(`
      const base = box(40, 40, 20);
      return base.hole('top', { u: 0, v: 0, diameter: 10, depth: 8 });
    `);
    const walls = lineagesWithLabelName(shape, 'wall');
    expect(walls.length).toBeGreaterThanOrEqual(1);
    for (const { lineage } of walls) {
      expect(lineage.labelName).toBe('wall');
      expect(lineage.snapshot).toBeDefined();
      expect(lineage.snapshot!.area).toBeGreaterThan(0);
      expect(lineage.featureId).toBeDefined();
      expect(lineage.featureKind).toBe('hole');
    }
  });

  it('holes lowerer writes featureKind="holes" on each bore wall', async () => {
    const shape = await lowerScript(`
      const base = box(60, 60, 20);
      return base.holes('top', {
        positions: [
          { u: -20, v: -20 },
          { u:  20, v: -20 },
          { u: -20, v:  20 },
          { u:  20, v:  20 },
        ],
        diameter: 5,
        depth: 'through',
      });
    `);
    const walls = lineagesWithLabelName(shape, 'wall');
    expect(walls.length).toBeGreaterThanOrEqual(1);  // collective wall ref covers all bores
    for (const { lineage } of walls) {
      expect(lineage.featureKind).toBe('holes');
      expect(lineage.snapshot).toBeDefined();
    }
  });

  it('cutout lowerer writes featureKind="cutout" on the side walls', async () => {
    const shape = await lowerScript(`
      const sk = path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close();
      return box(40, 40, 20).cutout(sk, { face: 'top', depth: 6 });
    `);
    const walls = lineagesWithLabelName(shape, 'wall');
    expect(walls.length).toBeGreaterThanOrEqual(1);
    for (const { lineage } of walls) {
      expect(lineage.featureKind).toBe('cutout');
      expect(lineage.snapshot).toBeDefined();
    }
  });

  it('snapshot area on the bore wall matches π·D·depth ≈ side area of the cylinder', async () => {
    // Hole D=10, depth=8 → cylindrical wall area = π * 10 * 8 ≈ 251 mm².
    // (Replicad's face.center for a cylindrical face lies ON the surface,
    // not on the axis, so we don't test centroid placement here — area is
    // the more reliable invariant.)
    const shape = await lowerScript(`
      const base = box(40, 40, 20);
      return base.hole('top', { u: 0, v: 0, diameter: 10, depth: 8 });
    `);
    const walls = lineagesWithLabelName(shape, 'wall');
    expect(walls.length).toBeGreaterThanOrEqual(1);
    const w = walls[0].lineage.snapshot!;
    const expected = Math.PI * 10 * 8;
    expect(w.area).toBeGreaterThan(expected - 5);
    expect(w.area).toBeLessThan(expected + 5);
  });
});
