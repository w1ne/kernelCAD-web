import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';

describe('created-ref survives fillet chain (E2E)', () => {
  beforeAll(async () => { await initOcct(); });

  it('three filleting ops do not lose the bore wall created ref', async () => {
    const code = `
      const block = box(100, 60, 20)
        .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thruHole' });
      return block
        .fillet(0.3, { face: 'thruHole.entry-rim' })
        .fillet(1.0, { face: 'top' })
        .fillet(0.2, { face: 'thruHole.wall' });
    `;
    const { records } = await runScript({ code, fileName: '<inline>' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(records);

    const errs = result.diagnostics.filter((d) => d.code === 'feature.face-ref.removed');
    expect(errs).toEqual([]);
    // One warning is acceptable, more than one would be suspicious:
    const warns = result.diagnostics.filter((d) => d.code === 'feature.created-ref.fallback-used');
    expect(warns.length).toBeLessThanOrEqual(1);
  });
});
