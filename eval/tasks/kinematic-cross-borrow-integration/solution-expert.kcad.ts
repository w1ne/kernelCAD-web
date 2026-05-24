// Cross-borrow integration eval — composes three slices in one .kcad.ts:
//
//   1. 3D parametric curve API: nurbsCurve(controlPoints, { degree }) +
//      curve.sample(n) returns 8 stop positions along a gentle S-shape
//      rail (the curve-analytics borrow chain).
//
//   2. Topology refs: the arm's base part declares a named 'bottom' face;
//      the fastened mate to a rail-mount block binds via a topology-typed
//      connector origin (kind: 'face-center', name: 'bottom') — i.e.
//      a @kc[…] face ref pathway (the topology-query borrow chain).
//
//   3. Kinematic checkSweptCollision: sweeps the shoulder across
//      [-90°, 90°] at 5° step (37 samples — above the 36-sample safe
//      floor) at one selected stop position. Returns ok=true / source=local
//      (the kinematic-grounding borrow chain).
//
// All three slices are exercised; the script throws if any slice's
// invariant fails, so a clean evaluate <=> the cross-borrow chain held end
// to end.

// ---- (1) 3D parametric curve ----
const rail = nurbsCurve(
  [
    [0, 0, 0],
    [200, 100, 0],
    [400, 0, 0],
    [600, 100, 0],
  ],
  { degree: 3 },
);
const stops = rail.sample(7); // returns n+1 = 8 points
if (stops.length !== 8) {
  throw new Error(`curve.sample(7): expected 8 points; got ${stops.length}`);
}

// Pick the 4th stop position (index 3) — middle of the rail.
const stopPos = stops[3];

// ---- (2) Assembly + topology-bound fastener ----
const arm = assembly('cross-borrow-integration');

// Rail-mount block — small platform the arm base bolts to.
arm
  .part('rail', box(80, 80, 10, true).translate(stopPos[0], stopPos[1], stopPos[2] - 5))
  .connector('top', {
    type: 'frame',
    origin: { kind: 'vec3', value: [stopPos[0], stopPos[1], stopPos[2]] },
  });

// Arm base — declares a named 'bottom' face. The fastened mate below binds
// through the @kc[base/face/bottom] topology ref via the
// kind:'face-center'/name:'bottom' connector origin.
const baseShape = box(60, 60, 30).hole('bottom', {
  u: 0, v: 0, diameter: 5, depth: 'through',
});
// The fastened mate to the rail places the base at the stop position; no
// `at:` needed.
const base = arm.part('base', baseShape);
base.connector('rail-anchor', {
  type: 'frame',
  origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
});

// Single-link upper arm. Lifted in +Z so its body stays clear of the base
// block at zero pose and across the [-90°, 90°] sweep.
const upper = arm.part(
  'upper',
  box(200, 20, 20, true).translate(100, 0, 60),
);

arm.mate('rail-mount', 'rail.top', 'base.rail-anchor', 'fastened');
arm.revolute('shoulder', base, upper, {
  axis: [0, 0, 1],
  origin: [stopPos[0], stopPos[1], stopPos[2] + 30],
  limitsDeg: [-90, 90],
});

// ---- (3) Kinematic swept-collision at the selected stop ----
const swept = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [-90, 90, 5],
});
if (swept.source !== 'local') {
  throw new Error(`swept: source must be 'local'; got ${swept.source}`);
}
if (swept.posesSampled !== 37) {
  throw new Error(
    `swept: expected 37 posesSampled (-90..90 step 5); got ${swept.posesSampled}`,
  );
}
if (!swept.ok) {
  const codes = swept.diagnostics.map((d) => d.code).join(', ') || '(none)';
  throw new Error(
    `swept: expected ok=true at the selected stop; codes=${codes}`,
  );
}

return arm.solvedModel({ shoulder: 0 });
