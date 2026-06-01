// Canonical broken-mechanism fixture for the physics-loop parity test.
//
// Mirrors the P0 unit test #3 (`spring fastened by VEC3 origin onto a
// MOVING parent — PR #341 pattern`) but in script form so both CLI
// `kernelcad validate` AND Studio's runtime can load it through the
// normal `.kcad.ts` entry point.
//
// Why this fixture matters:
//
//   PR #341 shipped a Luxo-lamp build that produced "validate clean"
//   under the legacy validator surface, yet at any non-rest elbow pose
//   the spring drifted off the lower arm. The physics-grounded loop
//   was designed to catch exactly this. P1's parity test loads this
//   fixture through both surfaces (CLI + Studio runtime via reviewCad)
//   and asserts the SAME `mechanism: 'broken'` verdict + the SAME
//   `mechanism.disconnect` failure code. If a future PR re-opens the
//   CLI/Studio split, this fixture's parity assertion is what fails
//   in CI.
//
// Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan: docs/plans/2026-06-01-physics-loop-P1-surface-convergence.md

const arm = assembly('vec3-spring-broken');

// Upper arm: stationary, parent of the elbow joint.
const upperArmBody = box(80, 20, 10, true).translate(40, 0, 0);
const upperArmPart = arm.part('upper-arm', upperArmBody);
upperArmPart.connector('elbow', {
  type: 'axis',
  origin: { kind: 'vec3', value: [80, 0, 0] },
  axis: [0, 1, 0],
});

// Lower arm: rotates about the elbow.
const lowerArmBody = box(80, 20, 10, true).translate(40, 0, 0);
const lowerArmPart = arm.part('lower-arm', lowerArmBody);
lowerArmPart.connector('elbow', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 1, 0],
});
arm.mate('elbow', 'upper-arm.elbow', 'lower-arm.elbow', 'revolute', {
  limitsDeg: [-45, 45],
});

// Spring: authored at a translated WORLD position (the PR #341 pattern).
// The fastened mate's connectors are both at vec3 [0, 0, 0] in their
// respective local frames — so the solver pins spring-local-origin to
// lower-arm-local-origin. Spring's GEOMETRY sits at spring-local
// (40, 0, 15) (offset from its own local origin), so the rigidity
// invariant fails under elbow rotation: the spring drifts off the lower
// arm in world space because the vec3-mount doesn't physically realize
// fastened rigidity under motion.
const springShape = cylinder(20, 3, 16)
  .rotate([0, 1, 0], 90)
  .translate(40, 0, 15);
const springPart = arm.part('lower-spring', springShape);
springPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});
lowerArmPart.connector('springMount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});
arm.mate('spring-fix', 'lower-arm.springMount', 'lower-spring.mount', 'fastened');

return arm.model();
