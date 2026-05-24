// expected: ['kinematic.collision.swept']
//
// Snippet 5 — non-robotics mechanism: a laptop clamshell hinge swept across
// [-10°, 135°]. The base is a flat slab on the table. The lid pivots about
// a hinge along the rear edge. At hinge angle 0° the lid is closed on top of
// the base; as the angle approaches the negative end the lid swings down
// past the table plane and intersects a phantom "table" block placed below.
// We use this as a stand-in for "lid hits desk" or "lid hits keyboard"
// regressions in real hinge designs.

const arm = assembly('cookbook-clamshell-hinge');

// Table surface, modeled as a slab below the base — sits in -Z so the lid
// only intersects it if it swings past closed (negative hinge angle).
const table = arm.part('table', box(400, 300, 5, true).translate(0, 0, -10));

// Laptop base — sits on top of the table.
const base = arm.part('base', box(300, 200, 12, true).translate(0, 0, 6));

// Lid — same footprint, thinner. At hinge=0° the lid sits flat on top of
// the base; the hinge pivot lives along the -Y rear edge of the base.
const lid = arm.part('lid', box(300, 200, 6, true).translate(0, 100, 3));

arm.revolute('hinge', base, lid, {
  axis: [1, 0, 0],
  origin: [0, -100, 12],
  limitsDeg: [-15, 135],
});

const r = await kinematic.checkSweptCollision(arm, {
  joint: 'hinge',
  range: [-15, 135, 1],
});
if (r.source !== 'local') throw new Error('source !== local');
const k1 = r.diagnostics.some((d) => d.code === 'kinematic.collision.swept');
if (!k1) throw new Error('expected K1 across the negative hinge band');
if (r.collidingPoses.length === 0)
  throw new Error('expected at least one colliding pose');

return arm.solvedModel({ hinge: 90 });
