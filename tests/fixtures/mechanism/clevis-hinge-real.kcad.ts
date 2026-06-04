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
// The child beam must fit BETWEEN the fork plates (Y span < forkGapY) and start
// clear of the fork's X-footprint, otherwise it engulfs the fork plates and
// interpenetrates (caught by the absolute 20 mm³ gate). knuckleR=12 → fork
// plates span x∈[-12,12]; forkGapY=24 gives a ±12 gap clearing the ±10 beam.
const ARM_HALF_W = 10;
const KNUCKLE_R = 12;
const armBody = box(120, 2 * ARM_HALF_W, 20, true).translate(KNUCKLE_R + 60, 0, 0);

const j = joint.clevis({
  parentBody: baseBody,
  childBody: armBody,
  axis: 'Y',
  pivotParent: [0, 0, 15],
  pivotChild: [0, 0, 0],
  // Upper limit capped at +25° so the arm's downward swing stays clear of the
  // tall base block at the swept extreme.
  limitsDeg: [-45, 25],
  style: { knuckleR: KNUCKLE_R, forkGapY: 24, tongueY: 20 },
});

const parent = arm.part('base', j.parentGeometry);
parent.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: j.parentConnector.origin },
  axis: j.parentConnector.axis,
  // The clevis tongue is drilled to a clearance bore (decision #2); pass the
  // bore radius so criterion 7 accepts the clearance fit at the pivot.
  jointClearanceRadius: j.parentConnector.clearanceRadius,
});

const child = arm.part('lower-arm', j.childGeometry);
child.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: j.childConnector.origin },
  axis: j.childConnector.axis,
  jointClearanceRadius: j.childConnector.clearanceRadius,
});

arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', {
  limitsDeg: [-45, 25],
});

return arm.model();
