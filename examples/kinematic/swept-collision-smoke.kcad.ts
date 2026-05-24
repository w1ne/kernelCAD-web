// Swept-collision inner-loop smoke. Builds a 2-DOF shoulder-elbow arm next
// to a wide base wall, then drives `kinematic.checkSweptCollision` across
// the shoulder range — verifying the loop fires K1 for poses that
// interfere with the wall and emits no errors when the sweep is clean.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate \
//     --file examples/kinematic/swept-collision-smoke.kcad.ts
//
// Expected console output (last line):
//   [smoke] swept-collision dispatch OK: cleanPoses=37, dirtyPoses>=13

const arm = assembly('swept-collision-smoke');

// Base wall on the -X side of the shoulder pivot. Wide in Y so the swept
// upper arm intersects it across the full [120°, 180°] band regardless of
// the elbow angle.
const base = arm.part('base', box(200, 400, 60, true).translate(-200, 0, 0));

// Upper-arm beam, 200mm long along its local +X. Back end at the shoulder
// pivot (upper-local x = 0).
const upper = arm.part('upper', box(200, 20, 20, true).translate(100, 0, 0));

// Forearm beam, 100mm long along its local +X. Back end at the elbow pivot.
const fore = arm.part('fore', box(100, 20, 20, true).translate(50, 0, 0));

arm.revolute('shoulder', base, upper, {
  axis: [0, 0, 1],
  origin: [0, 0, 0],
  limitsDeg: [-180, 180],
});

arm.revolute('elbow', upper, fore, {
  axis: [0, 1, 0],
  origin: [200, 0, 0],
  limitsDeg: [-90, 90],
});

// 1. clean sweep — shoulder ∈ [-90°, 90°] keeps the arm in the +X half-plane.
const clean = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [-90, 90, 5],
});
console.log(
  `[smoke] clean sweep: source=${clean.source} ok=${clean.ok} ` +
    `posesSampled=${clean.posesSampled} collidingPoses=${clean.collidingPoses.length}`,
);
if (clean.source !== 'local') throw new Error('clean sweep: source != local');
if (!clean.ok) throw new Error('clean sweep: ok unexpectedly false');
if (clean.collidingPoses.length !== 0)
  throw new Error('clean sweep: unexpected collisions');

// 2. dirty sweep — shoulder ∈ [120°, 180°] forces the arm to pass through
//    the base wall. Expect K1 (kinematic.collision.swept) to fire.
const dirty = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [120, 180, 5],
});
console.log(
  `[smoke] dirty sweep: source=${dirty.source} ok=${dirty.ok} ` +
    `posesSampled=${dirty.posesSampled} collidingPoses=${dirty.collidingPoses.length} ` +
    `diagnostics=${dirty.diagnostics.map((d) => d.code).join(',')}`,
);
if (dirty.ok) throw new Error('dirty sweep: ok unexpectedly true');
if (dirty.collidingPoses.length < 12)
  throw new Error(
    `dirty sweep: expected >=12 colliding poses, got ${dirty.collidingPoses.length}`,
  );
const hasK1 = dirty.diagnostics.some(
  (d) => d.code === 'kinematic.collision.swept',
);
if (!hasK1) throw new Error('dirty sweep: expected K1 diagnostic to fire');

// 3. coarse sweep — 0..90 at step 10 = 10 samples, below the 36-sample
//    revolute safe floor. Expect K2 sample-density-warning.
const coarse = await kinematic.checkSweptCollision(arm, {
  joint: 'shoulder',
  range: [0, 90, 10],
});
const hasK2 = coarse.diagnostics.some(
  (d) => d.code === 'kinematic.collision.swept.sample-density-warning',
);
console.log(
  `[smoke] coarse sweep: source=${coarse.source} posesSampled=${coarse.posesSampled} ` +
    `K2-fired=${hasK2}`,
);
if (!hasK2) throw new Error('coarse sweep: expected K2 sample-density-warning');

console.log(
  `[smoke] swept-collision dispatch OK: cleanPoses=${clean.posesSampled}, ` +
    `dirtyPoses>=${dirty.collidingPoses.length}`,
);

// Return a valid Scene so `kernelcad evaluate` finishes cleanly. Use a
// shoulder pose well clear of the base wall so the harness's interference
// gate (KERNELCAD_VALIDATE_DEFAULT=error) doesn't trip on the default pose.
return arm.solvedModel({ shoulder: 0, elbow: 0 });
