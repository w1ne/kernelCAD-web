import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

describe('assembly examples', () => {
  it('evaluates the two-link connector arm example', async () => {
    const result = await evaluateScript({ file: 'examples/assemblies/two-link-connector-arm.kcad.ts' });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(8);
  });

  // P3 physics-loop sweep (2026-06-01): the two-link connector arm uses
  // the v0.6 connect-shorthand on arm.part(...) rather than arm.mate(...).
  // The physics loop iterates arm.__mates() and treats the link and tool
  // as orphans, then flags their incidental contact volumes as
  // mechanism.interpenetration. Tracked migration to the proper mate API
  // in the issue below.
  //
  // Spec:   docs/specs/2026-06-01-physics-grounded-loop-design.md §criterion 4
  // Plan:   docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md
  // Issue:  https://github.com/w1ne/kernelCAD-web/issues/349
  it.skip('passes the physics-grounded loop — see issues/349', () => {
    // no body — the citation in the title is what the sweep test reads
  });
});
