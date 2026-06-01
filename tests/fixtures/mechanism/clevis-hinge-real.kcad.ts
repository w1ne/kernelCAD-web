// Canonical "mechanism: real" fixture for the physics-loop parity test.
//
// Mirrors the P0 unit test #1 (`joint.clevis hinge at all sampled poses
// → mechanism: real`) — the joint.clevis primitive welds the parent
// body, the child body, and the pin into a physically grounded hinge
// that satisfies all four mechanism-truth criteria at every sampled
// pose.
//
// Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan: docs/plans/2026-06-01-physics-loop-P1-surface-convergence.md

const arm = assembly('clevis-hinge-real');

const baseBody = box(40, 40, 30, true).translate(0, 0, -15);
const armBody = box(120, 20, 20, true).translate(70, 0, 0);

const j = joint.clevis({
  parentBody: baseBody,
  childBody: armBody,
  axis: 'Y',
  pivotParent: [0, 0, 15],
  pivotChild: [0, 0, 0],
  limitsDeg: [-45, 45],
});

const parent = arm.part('base', j.parentGeometry);
parent.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: j.parentConnector.origin },
  axis: j.parentConnector.axis,
});

const child = arm.part('lower-arm', j.childGeometry);
child.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: j.childConnector.origin },
  axis: j.childConnector.axis,
});

arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', {
  limitsDeg: [-45, 45],
});

return arm.model();
