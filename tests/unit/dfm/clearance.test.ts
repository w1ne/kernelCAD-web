// tests/unit/dfm/clearance.test.ts
//
// W3 Task 4 — part-pair clearance check (`dfmSpec({ minClearance })`
// enforcement primitive). Drives real scenes through `buildModel` on
// inline assembly scripts and exercises `checkClearance` directly:
//   - violated pair below the threshold, with the measured BREP distance,
//   - clear pair above the threshold, still listed with its distance,
//   - `ignore`d pair → status 'ignored', no measurement-based violation,
//   - mated pair (fastened) → status 'mated', skipped,
//   - overlapping pair → status 'interfering' (the interference gate owns
//     overlap; clearance emits NO violation for it),
//   - far-apart pair → bbox pre-filter pass-through (`exact: false`,
//     distance from the per-axis bbox lower bound, no BRepExtrema run).

import { describe, it, expect, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { pairKey } from '../../../src/modeling/runtime/detectInterferences';
import { parseConnectorRef } from '../../../src/modeling/mates/mate';
import { checkClearance } from '../../../src/modeling/runtime/dfm/clearance';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

const NONE: ReadonlySet<string> = new Set<string>();

interface BuiltScene {
  scene: SceneBackend;
  /** pairKey()-encoded part pairs joined by a declared mate, derived from
   *  the captured assembly record's mate metadata — the same source Task 7
   *  reads via `Assembly.__mates()`. */
  matedPairs: Set<string>;
}

async function buildScene(code: string): Promise<BuiltScene> {
  const model = await buildModel({ fileName: 'clearance.kcad.ts', code });
  expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  expect(isSceneBackend(model.rootShape)).toBe(true);

  const matedPairs = new Set<string>();
  for (const r of model.records) {
    const mates = (r.metadata as { mates?: readonly { a: string; b: string }[] } | undefined)?.mates;
    for (const m of mates ?? []) {
      const a = parseConnectorRef(m.a).partName;
      const b = parseConnectorRef(m.b).partName;
      if (a !== b) matedPairs.add(pairKey(a, b));
    }
  }
  return { scene: model.rootShape as SceneBackend, matedPairs };
}

/** Two corner-origin 10 mm cubes with an X gap of `gapMm` between the
 *  facing faces. No mates, no connectors. */
function twoBoxesScript(gapMm: number): string {
  return `
    const asm = assembly('clearance-test');
    asm.part('left', box(10, 10, 10), { at: [0, 0, 0] });
    asm.part('right', box(10, 10, 10), { at: [${10 + gapMm}, 0, 0] });
    return asm.solvedModel({}, { validate: 'off' });
  `;
}

describe('checkClearance — DFM part-pair clearance', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('flags a pair 0.30 mm apart against minClearance 0.45 with the measured distance', async () => {
    const { scene } = await buildScene(twoBoxesScript(0.30));
    const reports = checkClearance(scene, 0.45, NONE, NONE);
    expect(reports).toHaveLength(1);
    const r = reports[0];
    expect(pairKey(r.a, r.b)).toBe(pairKey('left', 'right'));
    expect(r.status).toBe('violated');
    expect(r.exact).toBe(true);
    expect(Math.abs(r.distanceMm - 0.30)).toBeLessThanOrEqual(0.01);
  });

  it('lists a clear pair (0.50 mm apart, minClearance 0.45) with its distance and no violation', async () => {
    const { scene } = await buildScene(twoBoxesScript(0.50));
    const reports = checkClearance(scene, 0.45, NONE, NONE);
    expect(reports).toHaveLength(1);
    const r = reports[0];
    expect(r.status).toBe('ok');
    expect(Math.abs(r.distanceMm - 0.50)).toBeLessThanOrEqual(0.01);
  });

  it("skips a pair in `ignore` with status 'ignored'", async () => {
    const { scene } = await buildScene(twoBoxesScript(0.30));
    const ignored = new Set([pairKey('left', 'right')]);
    const reports = checkClearance(scene, 0.45, ignored, NONE);
    expect(reports).toHaveLength(1);
    expect(reports[0].status).toBe('ignored');
    expect(reports.filter(p => p.status === 'violated')).toEqual([]);
  });

  it("skips a fastened-mate pair with status 'mated'", async () => {
    // Fastened mate lands the child's 'in' connector (local origin) on the
    // parent's 'out' connector at [10.3, 0, 0]: facing faces 0.30 mm apart —
    // a clearance violation by distance, but mated pairs are exempt.
    const { scene, matedPairs } = await buildScene(`
      const asm = assembly('clearance-mated');
      const parent = asm.part('parent', box(10, 10, 10));
      parent.connector('out', { type: 'frame', origin: { kind: 'vec3', value: [10.3, 0, 0] } });
      const child = asm.part('child', box(10, 10, 10));
      child.connector('in', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
      asm.mate('attach', 'parent.out', 'child.in', 'fastened');
      return asm.solvedModel({}, { validate: 'off' });
    `);
    expect(matedPairs.has(pairKey('parent', 'child'))).toBe(true);
    const reports = checkClearance(scene, 0.45, NONE, matedPairs);
    expect(reports).toHaveLength(1);
    expect(reports[0].status).toBe('mated');
    expect(reports.filter(p => p.status === 'violated')).toEqual([]);
  });

  it("reports overlapping parts as 'interfering' and emits NO clearance violation", async () => {
    // 5 mm overlap on X: the interference gate owns this defect class.
    const { scene } = await buildScene(twoBoxesScript(-5));
    const reports = checkClearance(scene, 0.45, NONE, NONE);
    expect(reports).toHaveLength(1);
    expect(reports[0].status).toBe('interfering');
    expect(reports.filter(p => p.status === 'violated')).toEqual([]);
  });

  it('passes a far-apart pair through the bbox pre-filter (exact: false, bbox lower bound)', async () => {
    const { scene } = await buildScene(twoBoxesScript(25));
    const reports = checkClearance(scene, 0.45, NONE, NONE);
    expect(reports).toHaveLength(1);
    const r = reports[0];
    expect(r.status).toBe('ok');
    expect(r.exact).toBe(false);
    // Axis-aligned boxes: the per-axis bbox lower bound IS the gap.
    expect(Math.abs(r.distanceMm - 25)).toBeLessThanOrEqual(0.01);
  });

  it('appends no diagnostics on a healthy sweep', async () => {
    const { scene } = await buildScene(twoBoxesScript(0.30));
    const diagnostics: CompilerDiagnostic[] = [];
    checkClearance(scene, 0.45, NONE, NONE, diagnostics);
    expect(diagnostics).toEqual([]);
  });
});
