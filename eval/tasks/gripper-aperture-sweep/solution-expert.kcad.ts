// Parallel-jaw gripper. Two prismatic fingers slide apart along ±X; the
// `right-slide` mate is the actuator (limits 0..25 mm) and `left-slide` is
// coupled to it 1:1 so a single source pose drives both jaws symmetrically.
// At pose 0 both fingertips touch at the X=0 plane; at the upper limit each
// jaw has translated 25 mm so the tips are 50 mm apart.
//
// Pose-envelope review samples the source mate's limits and computes
// aperture between `left-finger.tip` and `right-finger.tip` at each sample.

const baseW = 60;        // palm width  (X)
const baseD = 40;        // palm depth  (Y)
const baseH = 20;        // palm height (Z)
const jawT  = 8;         // jaw thickness along travel axis (X)
const jawD  = 30;        // jaw depth (Y)
const jawH  = 50;        // jaw height (Z)
const travelMm = 25;     // per-jaw stroke; total aperture = 2 * travelMm

const hand = assembly('parallel-jaw gripper');

const palm = hand.part('palm', box(baseW, baseD, baseH, true).color('plate'));
palm
  .connector('left-rail', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, baseH / 2] },
    axis: [-1, 0, 0],            // positive pose moves left jaw in -X
  })
  .connector('right-rail', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, baseH / 2] },
    axis: [1, 0, 0],             // positive pose moves right jaw in +X
  });

const left = hand.part('left-finger', box(jawT, jawD, jawH, true).color('tool'));
left
  .connector('rail', {
    type: 'axis',
    origin: { kind: 'vec3', value: [jawT / 2, 0, -jawH / 2] },
    axis: [-1, 0, 0],
  })
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [jawT / 2, 0, jawH / 2] },
  });

const right = hand.part('right-finger', box(jawT, jawD, jawH, true).color('tool'));
right
  .connector('rail', {
    type: 'axis',
    origin: { kind: 'vec3', value: [-jawT / 2, 0, -jawH / 2] },
    axis: [1, 0, 0],
  })
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-jawT / 2, 0, jawH / 2] },
  });

// Actuator: `right-slide` carries the declared travel limits.
hand.mate('right-slide', 'palm.right-rail', 'right-finger.rail', 'prismatic', {
  limitsMm: [0, travelMm],
});
// Mirror: `left-slide` is driven 1:1 from `right-slide`. The mirrored connector
// axis ([-1,0,0]) flips the world translation back into -X for the left jaw.
hand.mate('left-slide', 'palm.left-rail', 'left-finger.rail', 'prismatic');
hand.coupleMates('left-slide', { source: 'right-slide', ratio: 1 });

return hand.model();
