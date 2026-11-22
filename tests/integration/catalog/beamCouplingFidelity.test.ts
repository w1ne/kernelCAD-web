// SPDX-License-Identifier: MIT
// A geometric regression: color/preview transport checks cannot detect when a
// helical coupling has been replaced with four decorative axial slots.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { brepValid } from '../../threadGeometryHelpers';

const sourceFile = resolve(import.meta.dirname, '../../../catalog/kits/standard-components/beam-coupling.kcad.ts');
const source = readFileSync(sourceFile, 'utf8');

async function build(size: 'compact' | 'standard' | 'large' = 'standard', omit?: 'helix' | 'set-screws') {
  let code = source.replace("param('size', 'standard'", `param('size', '${size}'`);
  if (omit === 'helix') code = code.replace('coupling = coupling.subtract(helicalSlot);', '// negative control, remove helical cut');
  if (omit === 'set-screws') code = code.replace('for (const z of [2.5, 27.5]) {', 'for (const z of []) {');
  let result: { volume: number; size: number[]; valid: boolean } | undefined;
  const exported = await runAndExport({
    code,
    fileName: 'beam-coupling.kcad.ts',
    scriptDir: resolve(sourceFile, '..'),
    format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1000 } },
    onBuild(root) {
      const shape = root as OcctBackend;
      const bb = shape.boundingBox({ exact: true });
      result = {
        volume: shape.volume(),
        size: bb.max.map((v, i) => v - bb.min[i]!),
        valid: brepValid(shape),
      };
    },
  });
  expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  expect(exported.bytes.byteLength).toBeGreaterThan(1000);
  expect(result).toBeDefined();
  return result!;
}

describe('CC0 beam coupling representation', () => {
  beforeAll(async () => { await initOcct(); });

  it('builds one valid 18×18×30 mm solid and preserves all three size choices', async () => {
    const reference = await build('standard');
    expect(reference.valid).toBe(true);
    expect(reference.size[0]).toBeCloseTo(18, 1);
    expect(reference.size[1]).toBeCloseTo(18, 1);
    expect(reference.size[2]).toBeCloseTo(30, 1);
    for (const [choice, scale] of [['compact', 0.75], ['large', 1.25]] as const) {
      const model = await build(choice);
      expect(model.valid).toBe(true);
      for (let axis = 0; axis < 3; axis++) {
        expect(model.size[axis]).toBeCloseTo(reference.size[axis]! * scale, 1);
      }
      expect(model.volume / reference.volume).toBeCloseTo(scale ** 3, 2);
    }
  }, 90000);

  it('has a material-removing helix and two real radial hub bores', async () => {
    expect(source).toContain('.sweep(helix(');
    const real = await build('standard');
    const noHelix = await build('standard', 'helix');
    const noSetScrews = await build('standard', 'set-screws');
    expect(real.valid && noHelix.valid && noSetScrews.valid).toBe(true);
    expect(noHelix.volume - real.volume).toBeGreaterThan(180); // actual ~249 mm³
    expect(noSetScrews.volume - real.volume).toBeGreaterThan(35); // actual ~53 mm³
  }, 90000);
});
