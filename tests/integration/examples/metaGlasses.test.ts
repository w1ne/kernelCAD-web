import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { loadScriptFeatures } from '../../../src/modeling/runtime/scriptLoader';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

describe('Meta glasses gallery example', () => {
  it('evaluates as a full smart-glasses model with temples and Meta cues', async () => {
    const file = 'examples/gallery/meta-glasses.kcad.ts';
    const result = await evaluateScript({ file });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(45);

    const loaded = await loadScriptFeatures(file);
    const source = loaded.source;

    expect(loaded.features.length).toBeGreaterThanOrEqual(45);
    expect(source).toContain('full-Wayfarer-front-frame');
    expect(source).toContain('left-connected-electronics-temple-with-ear-bend');
    expect(source).toContain('right-connected-electronics-temple-with-ear-bend');
    expect(source).toContain('right-temple-glossy-touch-control-strip');
    expect(source).toContain('left-recessed-Meta-camera-bezel');
    expect(source).toContain('right-privacy-LED-diffuser');
  });

  // The P3 physics-loop sweep (2026-06-01, issue #350) flagged six
  // interpenetrations: temples sunk 4 mm into the frame back, hinge barrels
  // inside solid temples, a solid camera bezel around the camera glass and
  // a touch strip embedded in the right temple. The model now seats each
  // pair face to face (bore, ring and recess). Hosted here for the sweep
  // gate (HOSTED_IN_DEDICATED_FILE in exampleSweepShared.ts).
  it('examples/gallery/meta-glasses.kcad.ts passes the physics-grounded loop', async () => {
    const result = await runValidateCli({
      file: 'examples/gallery/meta-glasses.kcad.ts',
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: false,
    });

    expect(result.mechanismFailures ?? [], JSON.stringify(result.mechanismFailures ?? [])).toEqual([]);
    expect(result.mechanism).toBe('real');
  }, 120_000);
});
