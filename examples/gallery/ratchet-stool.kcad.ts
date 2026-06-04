// Ratchet height-adjust stool.
//
// A mechanically honest furniture concept: round laminated seat, telescoping
// center post, exposed ratchet rack, spring-pawl lever, collar, foot ring, and
// splayed tube legs. The ratchet is represented as visible load-path geometry,
// not as a hidden motorized or simulation-only mechanism.

const previewScale = 0.18;
function mm(value: number) {
  return value * previewScale;
}

const seatRadius = mm(92);
const seatThickness = mm(13);
const cushionThickness = mm(5);
const seatZ = mm(154);

const sleeveHeight = mm(86);
const sleeveRadius = mm(18);
const innerPostRadius = mm(12);
const baseZ = 0;
const sleeveTopZ = baseZ + sleeveHeight;
const innerPostBaseZ = sleeveTopZ - mm(18);
const undersidePlateBaseZ = seatZ - mm(7);
const innerPostHeight = undersidePlateBaseZ - innerPostBaseZ;

const collarHeight = mm(10);
const collarRadius = mm(24);
const footRingZ = mm(48);
const legTopZ = mm(25);
const legFootZ = mm(3);
const heightAdjustMm = param('heightAdjustMm', 0, { min: 0, max: 34 });

setCameraTarget(mm(24), 0, mm(84));

function cylZ(height: number, radius: number, zBase: number, segments = 80) {
  return cylinder(height, radius, segments).translate(0, 0, zBase);
}

function tubeBetween(
  name: string,
  start: [number, number, number],
  end: [number, number, number],
  radius: number,
  color: string,
  segments = 32,
) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const axis: [number, number, number] = [dx / len, dy / len, dz / len];
  return {
    name,
    shape: cylinder(len, radius, segments)
      .alongAxis(axis)
      .translate(start[0], start[1], start[2])
      .color(color),
  };
}

function radialPoint(radius: number, deg: number, z: number): [number, number, number] {
  const rad = (deg * Math.PI) / 180;
  return [radius * Math.cos(rad), radius * Math.sin(rad), z];
}

function frameConnector(origin: [number, number, number]) {
  return { type: 'frame', origin: { kind: 'vec3', value: origin } };
}

function axisConnector(origin: [number, number, number], axis: [number, number, number]) {
  return { type: 'axis', origin: { kind: 'vec3', value: origin }, axis };
}

const stool = assembly('exposed ratchet height-adjust stool');

// G0 (2026-05-31) migration helper: the v0.5 `arm.fixed(label, parent, child,
// {origin})` shortcut is gone. The mate-vocabulary equivalent is a connector
// pair (parent: `frame` at the join origin in the parent's local frame;
// child: `frame` at the child's local origin since each part's authored
// shape is already positioned in world space here) plus a `'fastened'` mate.
// `fastenAt` packages that pattern so the gallery script stays compact.
// Connector names are auto-numbered per-fastener so multi-join parts (e.g.
// `outerSleeve` welded to the foot ring AND to four legs) get unique names.
let fastenSeq = 0;
function fastenAt(
  label: string,
  parent: ReturnType<typeof stool.part>,
  child: ReturnType<typeof stool.part>,
  origin: [number, number, number],
) {
  const slot = ++fastenSeq;
  const parentConn = `fastener-${slot}-parent`;
  const childConn = `fastener-${slot}-child`;
  parent.connector(parentConn, frameConnector(origin));
  child.connector(childConn, frameConnector(origin));
  stool.mate(
    `${label}-mate-${slot}`,
    `${parent.name}.${parentConn}`,
    `${child.name}.${childConn}`,
    'fastened',
  );
}

const seatDisk = stool.part(
  'round-laminated-wood-seat-with-softened-edge',
  cylZ(seatThickness, seatRadius, seatZ, 128)
    .fillet(mm(3))
    .color('#9a6b3f'),
);
const cushion = stool.part(
  'thin-dark-cork-cushion-pad-bonded-to-seat-top',
  cylZ(cushionThickness, seatRadius - mm(9), seatZ + seatThickness, 128)
    .fillet(mm(2))
    .color('#2b2925'),
);
seatDisk.connector('top-pad-face', frameConnector([0, 0, seatZ + seatThickness]));
cushion.connector('seat-contact-face', frameConnector([0, 0, seatZ + seatThickness]));
stool.mate('seat-pad-bond', 'round-laminated-wood-seat-with-softened-edge.top-pad-face', 'thin-dark-cork-cushion-pad-bonded-to-seat-top.seat-contact-face', 'fastened');

const undersidePlate = stool.part(
  'black-steel-underside-load-spreader-plate-below-seat',
  cylZ(mm(7), mm(42), undersidePlateBaseZ, 80)
    .color('#202428'),
);
seatDisk.connector('underseat-bolt-face', frameConnector([0, 0, seatZ]));
undersidePlate.connector('seat-bolt-face', frameConnector([0, 0, seatZ]));
stool.mate('seat-to-load-spreader', 'round-laminated-wood-seat-with-softened-edge.underseat-bolt-face', 'black-steel-underside-load-spreader-plate-below-seat.seat-bolt-face', 'fastened');

const innerPost = stool.part(
  'bright-telescoping-inner-post-ending-below-seat-plate',
  cylZ(innerPostHeight, innerPostRadius, innerPostBaseZ, 80)
    .color('#d6dadd'),
);
innerPost.connector('height-slide', axisConnector([0, 0, innerPostBaseZ], [0, 0, 1]));
innerPost.connector('top-plate-face', frameConnector([0, 0, undersidePlateBaseZ]));
undersidePlate.connector('post-face', frameConnector([0, 0, undersidePlateBaseZ]));
stool.mate('post-to-seat-plate', 'bright-telescoping-inner-post-ending-below-seat-plate.top-plate-face', 'black-steel-underside-load-spreader-plate-below-seat.post-face', 'fastened');

const outerSleeve = stool.part(
  'matte-black-outer-sleeve-guiding-telescoping-post',
  cylZ(sleeveHeight, sleeveRadius, baseZ, 96)
    .color('#22272b'),
);
outerSleeve.connector('height-rail', axisConnector([0, 0, innerPostBaseZ], [0, 0, 1]));
stool.mate('height-adjust', 'matte-black-outer-sleeve-guiding-telescoping-post.height-rail', 'bright-telescoping-inner-post-ending-below-seat-plate.height-slide', 'prismatic', {
  pose: heightAdjustMm.multiply(previewScale),
  limitsMm: [0, 34],
});

const upperCollar = stool.part(
  'split-clamp-collar-at-top-of-sleeve',
  cylZ(collarHeight, collarRadius, sleeveTopZ - collarHeight, 96)
    .subtract(cylZ(collarHeight + mm(1), sleeveRadius + mm(1.4), sleeveTopZ - collarHeight - mm(0.5), 96))
    .color('#353b40'),
);
fastenAt('split-collar-on-sleeve-mouth', outerSleeve, upperCollar, [0, 0, sleeveTopZ - collarHeight / 2]);

const rackBacker = stool.part(
  'vertical-ratchet-rack-backer-welded-to-inner-post',
  box(mm(8), mm(7), mm(72), true)
    .translate(innerPostRadius + mm(4), 0, sleeveTopZ + mm(22))
    .color('#c5c9cc'),
);
innerPost.connector('rack-weld-face', frameConnector([innerPostRadius, 0, sleeveTopZ + mm(22)]));
rackBacker.connector('post-weld-face', frameConnector([innerPostRadius, 0, sleeveTopZ + mm(22)]));
stool.mate('rack-to-post-weld', 'bright-telescoping-inner-post-ending-below-seat-plate.rack-weld-face', 'vertical-ratchet-rack-backer-welded-to-inner-post.post-weld-face', 'fastened');

for (let i = 0; i < 9; i += 1) {
  const z = sleeveTopZ - mm(9) + i * mm(8);
  const tooth = stool.part(
    `forward-facing-ratchet-tooth-${i + 1}`,
    box(mm(13), mm(9), mm(2.6), true)
      .rotate([0, 1, 0], -22)
      .translate(innerPostRadius + mm(10.5), 0, z)
      .color('#e1e4e6'),
  );
  rackBacker.connector(`tooth-${i + 1}-seat`, frameConnector([innerPostRadius + mm(8), 0, z]));
  tooth.connector('rack-seat', frameConnector([innerPostRadius + mm(8), 0, z]));
  stool.mate(`ratchet-tooth-${i + 1}-weld`, `vertical-ratchet-rack-backer-welded-to-inner-post.tooth-${i + 1}-seat`, `forward-facing-ratchet-tooth-${i + 1}.rack-seat`, 'fastened');
}

const pawlPivot = stool.part(
  'round-pawl-pivot-boss-on-sleeve',
  cylinder(mm(10), mm(8), 48)
    .alongAxis([0, 1, 0])
    .translate(sleeveRadius + mm(3), mm(-4), sleeveTopZ + mm(8))
    .color('#41484e'),
);
fastenAt('pawl-pivot-on-sleeve', outerSleeve, pawlPivot, [sleeveRadius + mm(3), mm(-4), sleeveTopZ + mm(8)]);

const pawlLever = stool.part(
  'curved-release-pawl-lever-biting-into-rack-teeth',
  box(mm(54), mm(7), mm(5), true)
    .rotate([0, 1, 0], 12)
    .translate(sleeveRadius + mm(24), mm(-9), sleeveTopZ + mm(21))
    .color('#59616a'),
);
fastenAt('pawl-lever-on-pivot', pawlPivot, pawlLever, [sleeveRadius + mm(9), mm(-7), sleeveTopZ + mm(17)]);

const pawlNose = stool.part(
  'hardened-pawl-nose-seated-between-ratchet-teeth',
  box(mm(11), mm(9), mm(6), true)
    .rotate([0, 1, 0], -20)
    .translate(innerPostRadius + mm(15), mm(-6), sleeveTopZ + mm(18))
    .color('#d3d7da'),
);
fastenAt('pawl-nose-on-lever', pawlLever, pawlNose, [innerPostRadius + mm(15), mm(-6), sleeveTopZ + mm(18)]);

const releaseKnob = stool.part(
  'small-red-thumb-tab-on-pawl-release-lever',
  cylinder(mm(8), mm(6), 32)
    .alongAxis([0, 1, 0])
    .translate(sleeveRadius + mm(51), mm(-13), sleeveTopZ + mm(27))
    .color('#b23a2f'),
);
fastenAt('thumb-tab-on-lever', pawlLever, releaseKnob, [sleeveRadius + mm(50), mm(-12), sleeveTopZ + mm(27)]);

const spring = stool.part(
  'visible-return-spring-from-collar-lug-to-pawl-lever',
  cylinder(mm(36), mm(1.5), 16)
    .alongAxis([0.925, -0.185, -0.324])
    .translate(sleeveRadius + mm(6), mm(3), sleeveTopZ + mm(2))
    .color('#b8bdc1'),
);
fastenAt('return-spring-on-collar', upperCollar, spring, [sleeveRadius + mm(8), mm(2), sleeveTopZ + mm(2)]);

const footRing = stool.part(
  'circular-tubular-foot-ring-welded-around-lower-sleeve',
  torus(mm(54), mm(3.2), 96)
    .translate(0, 0, footRingZ)
    .color('#4b545b'),
);
fastenAt('foot-ring-on-sleeve', outerSleeve, footRing, [0, 0, footRingZ]);

for (const deg of [45, 135, 225, 315]) {
  const top = radialPoint(mm(24), deg, legTopZ);
  const foot = radialPoint(mm(82), deg, legFootZ);
  const legSpec = tubeBetween(`splayed-tubular-leg-${deg}-degrees`, top, foot, mm(5.2), '#30373d');
  const leg = stool.part(legSpec.name, legSpec.shape);
  fastenAt(`splayed-leg-${deg}-on-sleeve`, outerSleeve, leg, top);

  const footPad = stool.part(
    `rubber-leveling-foot-pad-${deg}-degrees`,
    cylinder(mm(6), mm(10), 40)
      .translate(foot[0], foot[1], 0)
      .color('#1b1b1b'),
  );
  fastenAt(`foot-pad-${deg}-on-leg`, leg, footPad, foot);

  const ringStrutSpec = tubeBetween(
    `short-foot-ring-support-strut-${deg}-degrees`,
    radialPoint(mm(19), deg, footRingZ),
    radialPoint(mm(54), deg, footRingZ),
    mm(2.5),
    '#4b545b',
  );
  const ringStrut = stool.part(ringStrutSpec.name, ringStrutSpec.shape);
  fastenAt(`ring-strut-${deg}-on-sleeve`, outerSleeve, ringStrut, radialPoint(mm(36), deg, footRingZ));
}

return stool.model();
