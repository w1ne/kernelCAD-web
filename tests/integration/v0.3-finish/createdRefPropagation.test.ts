// For each of: fillet, chamfer, shell — verify that a CreatedRefSpec
// written by an upstream `hole` survives the downstream op. Assert lineage
// still has the (featureId, labelName) tuple after the downstream lowering.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';

async function lowerCode(code: string) {
  const { records } = await runScript({ code, fileName: '<inline>' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const result = await engine.run(records);
  const lastRecord = records[records.length - 1];
  const shape = result.shapes.get(lastRecord.id) as OcctBackend | undefined;
  return { records, diagnostics: result.diagnostics, shape };
}

describe('CreatedRefSpec propagation across boolean-participating lowerers', () => {
  beforeAll(async () => { await initOcct(); });

  const cases: Array<{ op: string; code: string }> = [
    {
      op: 'fillet',
      code: `
        const plate = box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'pilot' });
        return plate.fillet(0.2, { face: 'pilot.floor' });
      `,
    },
    {
      op: 'chamfer',
      code: `
        const plate = box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'pilot' });
        return plate.chamfer(0.3, { face: 'pilot.entry-rim' });
      `,
    },
    {
      op: 'shell',
      code: `
        const plate = box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'pilot' });
        return plate.shell(0.5, { face: 'bottom' });
      `,
    },
  ];

  for (const c of cases) {
    it(`survives downstream ${c.op}`, async () => {
      const { diagnostics, shape } = await lowerCode(c.code);
      const errs = diagnostics.filter((d) => d.code === 'feature.face-ref.removed');
      expect(errs).toEqual([]);
      // Confirm the result shape still has a lineage entry tagged with the
      // upstream pilot hole feature (by looking up labelName lineages).
      const hMap = shape?.historyMap;
      expect(hMap).toBeDefined();
      const pilotLineages = Array.from(hMap!.values()).filter(
        (l) => l.labelName === 'wall' || l.labelName === 'floor' || l.labelName === 'entry-rim',
      );
      // At minimum, at least one wall/floor/rim lineage should still be present.
      // (For shell, the bore wall might be split — but at least one entry should survive.)
      expect(pilotLineages.length).toBeGreaterThan(0);
    });
  }

  // ── B. snapshotAtCreate + surfaceType immutability across downstream op ─────
  // Spec contract: snapshotAtCreate and surfaceType are written ONCE at face
  // creation and never refreshed. Downstream fillet/chamfer/shell may evolve
  // (or even drop) `snapshot`, but the immutable fingerprint must reach the
  // final shape byte-equal to the create-time value. This test compares the
  // pilot's hole-only lineage against the same pilot's lineage after each
  // downstream op.
  for (const c of cases) {
    it(`preserves snapshotAtCreate + surfaceType byte-equal across ${c.op}`, async () => {
      // Hole-only baseline — same hole, no downstream op.
      const baselineCode = `
        return box(40, 40, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 3, name: 'pilot' });
      `;
      const baseline = await lowerCode(baselineCode);
      const baseEntries = new Map<string, { snapshotAtCreate: unknown; surfaceType: unknown; labelName: string }>();
      for (const lin of baseline.shape!.historyMap!.values()) {
        if (lin.featureName === 'pilot' && lin.labelName && lin.snapshotAtCreate && lin.surfaceType) {
          baseEntries.set(lin.labelName, {
            snapshotAtCreate: lin.snapshotAtCreate,
            surfaceType: lin.surfaceType,
            labelName: lin.labelName,
          });
        }
      }
      // The hole baseline must produce at least `wall` and `floor` entries
      // with snapshotAtCreate + surfaceType populated.
      expect(baseEntries.size).toBeGreaterThanOrEqual(2);

      // Now lower the full chain (with downstream op) and verify each pilot
      // entry on the result still carries the SAME snapshotAtCreate and
      // surfaceType as the baseline.
      const after = await lowerCode(c.code);
      const afterEntries = new Map<string, { snapshotAtCreate: unknown; surfaceType: unknown }>();
      for (const lin of after.shape!.historyMap!.values()) {
        if (lin.featureName === 'pilot' && lin.labelName) {
          afterEntries.set(lin.labelName, {
            snapshotAtCreate: lin.snapshotAtCreate,
            surfaceType: lin.surfaceType,
          });
        }
      }

      // For each baseline pilot-slot that still appears in the after-map,
      // the immutable fields must be byte-equal. (Shell may split or drop
      // the wall, so we only assert on surviving slots.)
      let comparedAtLeastOne = false;
      for (const [slot, base] of baseEntries) {
        const post = afterEntries.get(slot);
        if (!post) continue;
        comparedAtLeastOne = true;
        // surfaceType is a string enum — strict equality is byte-equality.
        expect(post.surfaceType).toBe(base.surfaceType);
        // snapshotAtCreate is { centroid: Vec3, normal: Vec3, area: number }.
        // toEqual deep-compares numbers byte-equal (no rounding tolerance).
        expect(post.snapshotAtCreate).toEqual(base.snapshotAtCreate);
      }
      expect(comparedAtLeastOne).toBe(true);
    });
  }
});
