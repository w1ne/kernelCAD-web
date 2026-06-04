import { describe, it } from 'vitest';

describe('skill-built supported arm — deliberately-colliding fixture', () => {
  // P3 physics-loop sweep (2026-06-01): this example is the
  // deliberately-colliding negative-case fixture consumed by the
  // designLoop integration test (`tests/integration/mcp/designLoop.test.ts`)
  // — it is supposed to fail review. The physics loop catches both
  // disconnect and interpenetration defects (27 failures). Tracked
  // alongside the designLoop fixture rebuild in the issue below.
  //
  // Spec:   docs/specs/2026-06-01-physics-grounded-loop-design.md §criterion 1 / §criterion 2
  // Plan:   docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md
  // Issue:  https://github.com/w1ne/kernelCAD-web/issues/353
  it.skip('passes the physics-grounded loop — see issues/353', () => {
    // no body — the citation in the title is what the sweep test reads
  });
});
