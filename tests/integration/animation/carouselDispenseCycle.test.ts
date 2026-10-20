// tests/integration/animation/carouselDispenseCycle.test.ts
//
// Task 8 acceptance — the SpiceDispenser carousel's `dispense-cycle`
// animationView is interference-free at every pose the timeline visits.
//
// CI-runnable contract (build + verify, NO pixels): integration tests in this
// repo never spin up a headless browser or dev server, and frames-mode capture
// still needs one to RENDER. So the gate this test owns is the part that runs
// anywhere — the typed capture engine's verification pass: build the real
// fixture, read back its normalized animationView record, and run
// `verifyAnimation` directly over the dispense-cycle tracks.
//
// HERO GATE (memory rule: hero tests assert interferences === 0): the cycle
// must report ZERO collisions at every sampled pose. If verification ever
// FINDS a collision, that is a real mechanism finding — the test fails loudly
// with the offending rows; it is NEVER to be loosened, ignore-paired, or
// re-keyed away to go green. The two carousel DOFs are choreographed to never
// move at once and to clear by design; a collision here means the geometry or
// the cycle changed under us.
//
// GATE INTEGRITY: the cycle's metadata (name, duration, fps, track count) is
// asserted against the fixture-authored values so a silent edit to the
// timeline can't pass unnoticed.
//
// Perf: build (~30–90 s) + 11-pose verification sweep. Measured well under the
// ~60 s CI concern threshold on the reference machine, so no machineFactor
// budget is added here (the only per-test runtime assertion that would need it
// lives in the DFM truth set, which already calibrates).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModelFromFile, type BuiltModel } from '../../../src/modeling/buildModel';
import { verifyAnimation } from '../../../src/agent/render/verifyAnimation';
import { keyframeSampleSet } from '../../../src/agent/render/animationSampler';
import type {
  AnimationViewMetadata,
  NormalizedAnimationTrack,
} from '../../../src/shared/intent/animationViewRecord';

const FIXTURE = resolve('tests/fixtures/print-prep/spice-carousel-v7.6.1.kcad.ts');

let prevValidateDefault: string | undefined;
let model: BuiltModel;
let metadata: AnimationViewMetadata;
let tracks: NormalizedAnimationTrack[];

const paramValue = (m: BuiltModel, name: string): number =>
  m.session.paramTable.get(name).value as number;

beforeAll(async () => {
  // The carousel fixture carries design-intent near-touch interfaces that the
  // capture-time validity gate flags; keep that gate non-fatal so the build
  // succeeds and verifyAnimation — the subject under test — owns the verdict.
  // (Mirrors the DFM truth set's build setup.)
  prevValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT;
  process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
  await initOcct();
  model = await buildModelFromFile({ file: FIXTURE });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const anims = model.records.filter((r) => r.kind === 'animationView');
  expect(anims.length).toBeGreaterThan(0);
  metadata = anims[anims.length - 1].metadata as unknown as AnimationViewMetadata;
  tracks = metadata.tracks;
}, 300_000);

afterAll(() => {
  if (prevValidateDefault === undefined) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  else process.env.KERNELCAD_VALIDATE_DEFAULT = prevValidateDefault;
});

describe('carousel dispense-cycle — animationView record metadata', () => {
  it("declares the 'dispense-cycle' timeline: 4000 ms @ 30 fps, two tracks (drumDeg, meterDeg)", () => {
    expect(metadata.name).toBe('dispense-cycle');
    expect(metadata.durationMs).toBe(4000);
    expect(metadata.fps).toBe(30);
    expect(metadata.virtual).toBe(true);
    expect(tracks.map((t) => t.param).sort()).toEqual(['drumDeg', 'meterDeg']);
  });
});

describe('carousel dispense-cycle — motion verification (HERO GATE: zero collisions)', () => {
  it('is interference-free at every sampled pose and restores the params', async () => {
    const drumBefore = paramValue(model, 'drumDeg');
    const meterBefore = paramValue(model, 'meterDeg');

    const result = await verifyAnimation(model, tracks);

    // HERO GATE: zero collisions. If this fails, print the rows — that is a
    // real mechanism finding for the controller, NOT a gate to loosen.
    if (result.collisions.length > 0) {
      const rows = result.collisions
        .map((c) => `  tMs=${c.tMs}: '${c.a}' vs '${c.b}' — ${c.volumeMm3.toFixed(2)} mm³`)
        .join('\n');
      throw new Error(
        `dispense-cycle MECHANISM FINDING: ${result.collisions.length} collision(s) — do NOT loosen the gate, report to the controller:\n${rows}`,
      );
    }
    expect(result.collisions).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);

    // Every keyframe-set pose was actually solved + lowered (none skipped).
    expect(result.posesSampled).toBe(keyframeSampleSet(tracks).length);

    // Restoration contract: the drum/meter params are back at their
    // pre-verification values for any later consumer of the model.
    expect(paramValue(model, 'drumDeg')).toBe(drumBefore);
    expect(paramValue(model, 'meterDeg')).toBe(meterBefore);
  }, 300_000);
});
