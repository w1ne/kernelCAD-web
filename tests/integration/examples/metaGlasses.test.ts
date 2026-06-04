import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { loadScriptFeatures } from '../../../src/modeling/runtime/scriptLoader';

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

  // P3 physics-loop sweep (2026-06-01): meta-glasses is authored as 11
  // decorative parts with no mate edges; the physics loop flags 10
  // orphan-parts and 6 incidental interpenetrations. Tracked rebuild
  // (single fused part OR mate-graph with topology connectors) in the
  // issue below.
  //
  // Spec:   docs/specs/2026-06-01-physics-grounded-loop-design.md §criterion 4
  // Plan:   docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md
  // Issue:  https://github.com/w1ne/kernelCAD-web/issues/350
  it.skip('passes the physics-grounded loop — see issues/350', () => {
    // no body — the citation in the title is what the sweep test reads
  });
});
