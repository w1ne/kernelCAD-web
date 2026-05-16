import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/kernel/backends/occt/occtLowerer';

async function lowerCode(code: string) {
  const { records } = await runScript({ code, fileName: '<inline>' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const result = await engine.run(records);
  return { records, diagnostics: result.diagnostics };
}

describe('created-ref round-trip through edgeSelection', () => {
  beforeAll(async () => { await initOcct(); });

  it('hole-then-fillet-on-thruHole.entry-rim lowers without face-ref.* errors', async () => {
    const code = `
      const plate = box(40, 40, 10)
        .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thruHole' });
      return plate.fillet(0.2, { face: 'thruHole.entry-rim' });
    `;
    const { diagnostics } = await lowerCode(code);
    const errors = diagnostics.filter((d) => d.code.startsWith('feature.face-ref'));
    expect(errors).toEqual([]);
  });

  it('hole-then-fillet-on-pilot.wall lowers without face-ref.* errors (created-ref slot)', async () => {
    const code = `
      const plate = box(40, 40, 20)
        .hole('top', { u: 0, v: 0, diameter: 6, depth: 8, name: 'pilot' });
      return plate.fillet(0.2, { face: 'pilot.wall' });
    `;
    const { diagnostics } = await lowerCode(code);
    const errors = diagnostics.filter((d) => d.code.startsWith('feature.face-ref'));
    expect(errors).toEqual([]);
  });
});
