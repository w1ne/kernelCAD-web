// tests/integration/examples/sketchTextCorpus.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { readFileSync } from 'node:fs';

const repoRoot = resolve(__dirname, '../../..');

describe('sketch.text corpus tasks', () => {
  beforeAll(async () => { await initOcct(); });

  it('engraved-nameplate: evaluates + bbox + volume sanity', async () => {
    const scriptPath = resolve(repoRoot, 'eval/tasks/engraved-nameplate/solution-expert.kcad.ts');
    const code = readFileSync(scriptPath, 'utf-8');
    const result = await runScript({ code, fileName: scriptPath, scriptDir: resolve(scriptPath, '..') });
    const shape = result.returnValue as {
      lower(): Promise<{
        getReplicadShape(): { boundingBox: { bounds: number[][] } };
      }>;
    };
    const back = await shape.lower();
    const bounds = back.getReplicadShape().boundingBox.bounds;
    const bb = { min: bounds[0], max: bounds[1] };
    const w = bb.max[0] - bb.min[0];
    const d = bb.max[1] - bb.min[1];
    const h = bb.max[2] - bb.min[2];
    expect(w).toBeCloseTo(80, 0);
    expect(d).toBeCloseTo(30, 0);
    expect(h).toBeCloseTo(3, 0);
  });

  it('raised-logo-extrusion: evaluates + total height ≈ 3.5 mm', async () => {
    const scriptPath = resolve(repoRoot, 'eval/tasks/raised-logo-extrusion/solution-expert.kcad.ts');
    const code = readFileSync(scriptPath, 'utf-8');
    const result = await runScript({ code, fileName: scriptPath, scriptDir: resolve(scriptPath, '..') });
    const shape = result.returnValue as {
      lower(): Promise<{
        getReplicadShape(): { boundingBox: { bounds: number[][] } };
      }>;
    };
    const back = await shape.lower();
    const bounds = back.getReplicadShape().boundingBox.bounds;
    const bb = { min: bounds[0], max: bounds[1] };
    const h = bb.max[2] - bb.min[2];
    expect(h).toBeGreaterThan(3.2);
    expect(h).toBeLessThan(3.8);
  });
});
