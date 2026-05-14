// src/backends/occt/textLowerer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from './occtBackend';
import { runScript } from '../../script-runtime/runScript';

// Extract a sketch backend's underlying Drawing for bbox inspection.
async function lowerToDrawing(code: string) {
  const result = await runScript({ code, fileName: 'test.kcad.ts' });
  // Lower the sketch record. The session's RecomputeEngine + OcctLowerer
  // do this for us when we call .lower() on the returned proxy — but the
  // .extrude(...) consumes the sketch. For inspection we extrude with a
  // tiny depth + read the resulting bbox.
  const shape = result.returnValue as { lower(): Promise<{ getReplicadShape(): { boundingBox: { bounds: number[][] } } }> };
  const back = await shape.lower();
  const inner = back.getReplicadShape();
  const bounds = inner.boundingBox.bounds;
  return { min: bounds[0], max: bounds[1] };
}

describe('textLowerer: alignment + rotation', () => {
  beforeAll(async () => { await initOcct(); });

  it("align: 'left' puts text bbox-left at position.x", async () => {
    const code = `return sketch.text("XX", { size: 10, align: 'left', position: [5, 0] }).extrude(1);`;
    const bbox = await lowerToDrawing(code);
    // After extrude with depth 1 (Z [0,1]), X-min should equal 5.
    expect(bbox.min[0]).toBeCloseTo(5, 0);
  });

  it("align: 'right' puts text bbox-right at position.x", async () => {
    const code = `return sketch.text("XX", { size: 10, align: 'right', position: [25, 0] }).extrude(1);`;
    const bbox = await lowerToDrawing(code);
    expect(bbox.max[0]).toBeCloseTo(25, 0);
  });

  it("align: 'center' puts text bbox-center at position.x", async () => {
    const code = `return sketch.text("XX", { size: 10, align: 'center', position: [10, 0] }).extrude(1);`;
    const bbox = await lowerToDrawing(code);
    const center = (bbox.min[0] + bbox.max[0]) / 2;
    expect(center).toBeCloseTo(10, 0);
  });

  it('rotation: 90° rotates around position', async () => {
    const codeBefore = `return sketch.text("ABC", { size: 10, align: 'left', position: [0, 0], rotation: 0 }).extrude(1);`;
    const codeAfter = `return sketch.text("ABC", { size: 10, align: 'left', position: [0, 0], rotation: 90 }).extrude(1);`;
    const bb0 = await lowerToDrawing(codeBefore);
    const bb90 = await lowerToDrawing(codeAfter);
    // Width-before (X-extent) ≈ height-after (Y-extent).
    const widthBefore = bb0.max[0] - bb0.min[0];
    const heightAfter = bb90.max[1] - bb90.min[1];
    expect(heightAfter).toBeCloseTo(widthBefore, 0);
  });
});
