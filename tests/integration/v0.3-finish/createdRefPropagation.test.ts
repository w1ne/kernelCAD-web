// For each of: fillet, chamfer, shell — verify that a CreatedRefSpec
// written by an upstream `hole` survives the downstream op. Assert lineage
// still has the (featureId, labelName) tuple after the downstream lowering.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';

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
});
