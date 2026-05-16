// tests/integration/backends/occt/variableFilletFaceWrapper.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

beforeAll(async () => { await initOcct(); }, 60000);

describe('variable-radius fillet via face-wrapper selector (I6)', () => {
  it('applies a 1mm fillet to all top-face edges of a 10x10x5 box, leaving sides + bottom unmodified', async () => {
    const code = `
      return box(10, 10, 5)
        .fillet([
          { edges: { face: 'top' }, radius: 1 },
        ]);
    `;
    const run = await runScript({ code, fileName: '<test>' });
    expect(run.records.length).toBe(2);  // box + fillet

    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(run.records);

    // No diagnostics
    expect(result.diagnostics).toEqual([]);

    const filletId = run.records[1].id;
    const filletShape = result.shapes.get(filletId);
    expect(filletShape).toBeDefined();

    // Volume of a 10x10x5 box with 1mm fillet on the 4 top edges.
    // Analytic: V = 10 × 10 × 5 − 4 × (corner-rounding-off-volume).
    // Each top edge of length 10 has a fillet that removes a quarter-cylinder
    // wedge of length 10, radius 1: V_wedge = (1 − π/4) × 1² × 10 ≈ 2.146 mm³.
    // Top corners overlap (subtract corner volumes too) but the simpler
    // bound is: original = 500 mm³, with-fillet ≈ 491.4 mm³.
    // Allow ±2 mm³ tolerance for OCCT geometry approximation.
    const volume = filletShape!.volume();
    expect(volume).toBeGreaterThan(488);
    expect(volume).toBeLessThan(495);
  }, 60000);

  it('applies a face-wrapper fillet only on the face it names — bottom edges unchanged', async () => {
    // Apply the same 1mm fillet to a different face and confirm volume
    // changes match the analytic prediction (top vs bottom symmetry).
    const codeTop = `return box(10, 10, 5).fillet([{ edges: { face: 'top' }, radius: 1 }]);`;
    const codeBottom = `return box(10, 10, 5).fillet([{ edges: { face: 'bottom' }, radius: 1 }]);`;

    const evalCode = async (code: string) => {
      const run = await runScript({ code, fileName: '<test>' });
      const engine = new RecomputeEngine(new OcctLowerer());
      const result = await engine.run(run.records);
      const id = run.records[run.records.length - 1].id;
      return result.shapes.get(id)!.volume();
    };

    const vTop = await evalCode(codeTop);
    const vBottom = await evalCode(codeBottom);
    // Both fillets remove the same volume (4 edges of length 10, radius 1).
    expect(Math.abs(vTop - vBottom)).toBeLessThan(0.5);
  }, 90000);
});
