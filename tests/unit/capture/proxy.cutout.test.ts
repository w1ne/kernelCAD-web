// tests/unit/capture/proxy.cutout.test.ts
//
// Capture-time tests for Shape.cutout(). Covers:
//   - Captures correct FeatureRecord shape with target+profile inputs.
//   - Auto-closes a bare PathBuilder.
//   - Every §D.2 trigger from spec 2026-05-05-v0.3-slice1-hole-cutout-design
//     emits 'feature.invalid-args' + a hint substring.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { kernelErrorToDiagnostic } from '../../../src/script-runtime/kernelErrorToDiagnostic';

async function runAndCatch(code: string): Promise<unknown> {
  let caught: unknown;
  try {
    await runScript({ code, fileName: 'test.kcad.ts' });
  } catch (e) {
    caught = e;
  }
  return caught;
}

describe('Shape.cutout capture', () => {
  beforeAll(async () => { await initOcct(); });

  it('registers a cutout record with target+profile inputs and depthMode/depth params', async () => {
    const code = `
      const sk = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
      return box(20, 20, 20).cutout(sk, { face: 'top', depth: 6 });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    // box, sketch, cutout = 3 records
    expect(result.records).toHaveLength(3);
    const cutout = result.records[2];
    expect(cutout.kind).toBe('cutout');
    expect(cutout.inputs.target.kind).toBe('feature');
    expect(cutout.inputs.profile.kind).toBe('feature');
    expect(cutout.params.depth.evaluated).toBe(6);
    expect(cutout.params.depthMode.expression).toBe("'blind'");
  });

  it('auto-closes a bare PathBuilder', async () => {
    const code = `
      const pb = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3);
      return box(20, 20, 20).cutout(pb, { face: 'top', depth: 5 });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    // box + auto-closed sketch + cutout = 3 records
    expect(result.records).toHaveLength(3);
    expect(result.records[1].kind).toBe('sketch');
    expect(result.records[2].kind).toBe('cutout');
  });

  it("captures depthMode='through' when depth is 'through'", async () => {
    const code = `
      const sk = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
      return box(20, 20, 20).cutout(sk, { face: 'top', depth: 'through' });
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const cutout = result.records[2];
    expect(cutout.params.depthMode.expression).toBe("'through'");
    expect(cutout.params.depth).toBeUndefined();
  });

  // §D.2 triggers --------------------------------------------------------------

  it('feature.invalid-args when neither depth nor upToFace is set', async () => {
    const caught = await runAndCatch(`
      const sk = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
      return box(20, 20, 20).cutout(sk, { face: 'top' });
    `);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('depth (number');
  });

  it('feature.invalid-args when both depth and upToFace are set', async () => {
    const caught = await runAndCatch(`
      const sk = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
      return box(20, 20, 20).cutout(sk, { face: 'top', depth: 5, upToFace: { kind: 'canonical', face: 'bottom' } });
    `);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('not both');
  });

  it('feature.invalid-args when blind depth is non-positive', async () => {
    const caught = await runAndCatch(`
      const sk = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
      return box(20, 20, 20).cutout(sk, { face: 'top', depth: 0 });
    `);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('positive when blind');
  });

  it("feature.invalid-args when depthMode is not 'blind' or 'symmetric'", async () => {
    const caught = await runAndCatch(`
      const sk = path().moveTo(-3, -3).lineTo(3, -3).lineTo(3, 3).lineTo(-3, 3).close();
      return box(20, 20, 20).cutout(sk, { face: 'top', depth: 5, depthMode: 'oops' });
    `);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain("'blind' or 'symmetric'");
  });

  it('feature.invalid-args when straight-segment polyline self-intersects', async () => {
    // bowtie: corners cross between (-3,-3)→(3,3) and (3,-3)→(-3,3).
    const caught = await runAndCatch(`
      const sk = path().moveTo(-3, -3).lineTo(3, 3).lineTo(3, -3).lineTo(-3, 3).close();
      return box(20, 20, 20).cutout(sk, { face: 'top', depth: 5 });
    `);
    const diag = kernelErrorToDiagnostic(caught);
    expect(diag.code).toBe('feature.invalid-args');
    expect(diag.hint).toContain('self-intersects');
  });
});
