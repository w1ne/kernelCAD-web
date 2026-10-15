// SPDX-License-Identifier: MIT
// Small behavior replacements for former long-running geometry integrations.
import { describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { boxSoup } from '../../unit/reconstruct/testMeshes';

const init = initOcct();

describe('fast geometry replacements', () => {
  it('flags the 3 mm sink between two boxes', async () => {
    await init;
    const code = `const a = assembly('contact'); a.part('base', box(10,10,10)); a.part('sink', box(10,10,10).translate(0,0,7)); return a.model();`;
    const result = await checkInterference({ code, fileName: 'sink.kcad.ts', epsilonMm3: 0.01 });
    expect(result.pairs.map((p) => p.volumeMm3)).toEqual([expect.closeTo(300, 5)]);
  }, 4_500);

  it('a single spur gear exports as one solid with no interference pairs', async () => {
    await init;
    const code = `const a = assembly('gear'); a.part('gear', spurGear({ module: 1, teeth: 12, faceWidth: 2 })); return a.model();`;
    const result = await checkInterference({ code, fileName: 'gear.kcad.ts' });
    expect(result.pairs).toEqual([]);
    const stl = await runAndExport({ code, fileName: 'gear.kcad.ts', format: 'stl' });
    expect(stl.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(stl.bytes.byteLength).toBeGreaterThan(0);
  }, 4_500);

  it('reconstructs a tiny box mesh with faithful volume and deviation', async () => {
    const { reconstructFromSoup } = await import('../../../src/agent/reconstruct/reconstruct');
    const r = await reconstructFromSoup(boxSoup(10, 8, 2), async () => { const soup = boxSoup(10, 8, 2); const indices = Uint32Array.from({ length: soup.positions.length / 3 }, (_, i) => i); return { ok: true, mesh: { positions: soup.positions, indices } }; }, { maxPasses: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fidelity.volumeIoU).toBeGreaterThanOrEqual(0.98);
      expect(r.fidelity.maxDeviationMm).toBeLessThanOrEqual(0.05);
    }
  }, 4_500);

});
