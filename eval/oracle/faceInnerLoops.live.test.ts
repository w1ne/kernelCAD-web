// LIVE: the structural fidelity signal on real OCCT geometry via the CLI/MCP.
// A frame with two lens cutouts reports 2 inner loops whether or not lens
// bodies are inserted; a solid slab reports 0. This is the regression for the
// lens-insert false-negative a pixel/fill-ratio heuristic could not catch.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getMaxFaceInnerLoops } from './kernelcad-client';
import { computeFidelityGates, allFidelityGatesPass } from '../../src/lib/imageSimilarity/fidelityGates';

const dir = mkdtempSync(join(tmpdir(), 'faceloops-'));
function write(name: string, code: string): string {
  const p = join(dir, name);
  writeFileSync(p, code);
  return p;
}

const SLAB = write('slab.kcad.ts', `return box(140, 50, 60);`);
const FRAME = write('frame.kcad.ts', `
const plate = box(140, 50, 6);
const lensL = box(48, 34, 10).translate(15, 8, -2);
const lensR = box(48, 34, 10).translate(77, 8, -2);
return plate.subtract(lensL).subtract(lensR);`);
const LENSED = write('lensed.kcad.ts', `
const plate = box(140, 50, 6);
const lensL = box(48, 34, 10).translate(15, 8, -2);
const lensR = box(48, 34, 10).translate(77, 8, -2);
const frame = plate.subtract(lensL).subtract(lensR);
return frame.union(box(48, 34, 3).translate(15, 8, 1.5)).union(box(48, 34, 3).translate(77, 8, 1.5));`);

async function featureGatePasses(scriptPath: string): Promise<{ loops: number; pass: boolean }> {
  const loops = await getMaxFaceInnerLoops(scriptPath);
  const gates = computeFidelityGates(
    { maxFaceInnerLoops: loops, partsCount: 1, solidVolume: 1000 },
    { expectedInteriorLoops: 2 },
  );
  return { loops, pass: allFidelityGatesPass(gates) };
}

describe('LIVE structural fidelity gate on real OCCT', () => {
  it('frame-only (2 cutouts) → 2 loops → PASS', async () => {
    const r = await featureGatePasses(FRAME);
    expect(r.loops).toBe(2);
    expect(r.pass).toBe(true);
  }, 60000);

  it('lens-INSERTED → still 2 loops → PASS (invariant to lens insertion)', async () => {
    const r = await featureGatePasses(LENSED);
    expect(r.loops).toBe(2);
    expect(r.pass).toBe(true);
  }, 60000);

  it('solid slab → 0 loops → FAIL (slab-hack caught)', async () => {
    const r = await featureGatePasses(SLAB);
    expect(r.loops).toBe(0);
    expect(r.pass).toBe(false);
  }, 60000);
});
