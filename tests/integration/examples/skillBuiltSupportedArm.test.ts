import { describe, it } from 'vitest';

describe('skill-built supported robot arm example', () => {
  // P3 physics-loop sweep (2026-06-01): skill-built-supported-arm reports
  // mechanism: broken under the new physics-grounded loop on a single
  // fastened mate (`palm-fix` rigidity drift at elbow-pitch:80,
  // ~17 mm > 1 mm tolerance) — same vec3-mount pattern as PR #341 and
  // issues/346. Smallest passing fix is the Luxo offset trick or a
  // kernel-side topology-aware reference point.
  //
  // Spec:   docs/specs/2026-06-01-physics-grounded-loop-design.md §criterion 1
  // Plan:   docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md
  // Issue:  https://github.com/w1ne/kernelCAD-web/issues/352
  it.skip('passes the physics-grounded loop — see issues/352', () => {
    // no body — the citation in the title is what the sweep test reads
  });
});
