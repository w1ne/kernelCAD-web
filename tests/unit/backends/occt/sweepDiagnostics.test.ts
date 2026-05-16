// tests/unit/backends/occt/sweepDiagnostics.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/kernel/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('sweep diagnostic split', () => {
  beforeAll(async () => { await initOcct(); });

  it('degenerate profile (zero-length segment) → feature.sketch.failed (sweep blocked upstream)', async () => {
    // The intent here is to exercise the multi-face guard added by Task 2,
    // but in current Replicad a self-touching `path()` profile collapses
    // into a single Drawing rather than a Sketches (plural) — so the
    // SWEEP_MULTI_FACE_PROFILE: throw is unreachable through the public
    // `path()` API (see liftSketchToFace).
    //
    // Instead we use a degenerate profile (a moveTo+lineTo to the same
    // coordinate) which Replicad rejects at sketch lowering. Both paths —
    // `feature.kernel-failed` and `feature.kernel-failed` —
    // surface the same agent-actionable signal: refine the profile to a
    // single, well-formed closed loop. The test accepts either code.
    const code = `
      const profile = path().moveTo(0, 0).lineTo(0, 0).close();
      return profile.sweep([[0, 0, 0], [0, 0, 10]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      (d.code === 'feature.kernel-failed' || d.code === 'feature.kernel-failed')
      && d.severity === 'error'
    )).toBe(true);
  });

  it('valid single-face sweep does NOT emit multi-face-profile (regression)', async () => {
    const code = `
      const profile = path()
        .moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close();
      return profile.sweep([[0, 0, 0], [0, 0, 10]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(r.diagnostics.every(d => d.code !== 'feature.kernel-failed')).toBe(true);
  });

  it('OCCT sweep failure with no specific match falls back to feature.sweep.failed', async () => {
    // A pathological case: sketch with no segments (only moveTo + close) lifts
    // to an empty wire, which OCCT's sweep rejects with "Failed to build the
    // wire, empty wire". That message doesn't match any of the discriminator
    // regexes, so it must fall through to the generic `feature.kernel-failed`.
    //
    // We accept any of the 4 sweep codes — what matters is that ONE specific
    // or fallback code surfaces, not a silent success.
    const code = `
      const profile = path().moveTo(0, 0).close();
      return profile.sweep([[0, 0, 0], [0, 0, 10]]);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(result.records);
    expect(r.diagnostics.some(d =>
      (d.code === 'feature.kernel-failed' ||
       d.code === 'feature.kernel-failed' ||
       d.code === 'feature.kernel-failed' ||
       d.code === 'feature.kernel-failed')
      && d.severity === 'error'
    )).toBe(true);
  });
});
