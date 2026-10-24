// Collision geometry as convex pieces. A base plate carries two upright rods;
// a link swings on a post and its tip rests between the rods. The base is not
// convex: the hull of the whole base fills the gap between the rods, so the
// physics export would report the link touching the base where there is only
// air. `part.collision([...])` declares the base as its three convex pieces
// instead, and MuJoCo then collides with each piece's own hull. Mass and
// inertia still come from the real base shape.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/collision-shapes.kcad.ts

const plate = box(100, 40, 6, true).translate(0, 0, 3);
const rodA = cylinder(40, 4, 32).translate(-20, 0, 6);
const rodB = cylinder(40, 4, 32).translate(20, 0, 6);
const base = plate.union(rodA).union(rodB);

const post = box(10, 10, 30, true);
// Tip x +/-8, between the rods (rod surfaces start at |x| = 16).
const link = box(16, 70, 8, true).translate(0, 35, 0);

const axisX = (origin: [number, number, number]) => ({
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: origin },
  axis: [1, 0, 0] as [number, number, number],
});

const arm = assembly('collision-shapes');
arm
  .part('base', base)
  .connector('postPin', axisX([-14, -70, 24]))
  // Part-local frame, same as the shape and its connectors.
  .collision([plate, rodA, rodB]);
arm.part('post', post).connector('toBase', axisX([0, 0, 0])).connector('toLink', axisX([14, 0, 0]));
arm.part('link', link).connector('pivot', axisX([0, 0, 0]));

arm.mate('postHinge', 'base.postPin', 'post.toBase', 'revolute', { pose: 0, limitsDeg: [-20, 20] });
arm.mate('linkHinge', 'post.toLink', 'link.pivot', 'revolute', { pose: 0, limitsDeg: [-20, 20] });

return arm.solvedModel({});
