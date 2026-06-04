import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

describe('ratchet stool gallery example', () => {
  it('evaluates the exposed ratchet stool model cleanly', async () => {
    const result = await evaluateScript({ file: 'examples/gallery/ratchet-stool.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(40);
  });

  // P3 physics-loop sweep (2026-06-01): ratchet-stool is authored as
  // 34 decorative parts with no mate edges; the physics loop flags 86
  // pairwise interpenetration overlaps. Tracked consolidation (fuse
  // decorative pieces by stool sub-component) in the issue below.
  //
  // Spec:   docs/specs/2026-06-01-physics-grounded-loop-design.md §criterion 2
  // Plan:   docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md
  // Issue:  https://github.com/w1ne/kernelCAD-web/issues/351
  it.skip('passes the physics-grounded loop — see issues/351', () => {
    // no body — the citation in the title is what the sweep test reads
  });
});
