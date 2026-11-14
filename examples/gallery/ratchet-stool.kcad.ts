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
const sleeveBoreRadius = innerPostRadius + mm(0.5);
const baseZ = 0;
const sleeveTopZ = baseZ + sleeveHeight;
const innerPostBaseZ = sleeveTopZ - mm(18);
const undersidePlateBaseZ = seatZ - mm(7);
const innerPostHeight = undersidePlateBaseZ - innerPostBaseZ;

const collarHeight = mm(10);
const collarRadius = mm(24);
const footRingZ = mm(48);
const legTopZ = mm(25);
const legRadius = mm(5.2);
const footPadHeight = mm(6);
// The leg end disc is tilted, so its lowest rim sits up to one tube radius
// below the axis end. Ending the axis one radius above the pad top keeps the
// leg on the pad face instead of sunk into it.
const legFootZ = footPadHeight + legRadius;
const footRingMinorRadius = mm(3.2);

// Rack: teeth are tilted plates welded edge-on to the rack backer face.
const rackPitchMm = 8;
const toothLength = mm(13);
const toothThickness = mm(2.6);
const toothTiltDeg = 22;
const toothTilt = (toothTiltDeg * Math.PI) / 180;
const rackFaceX = innerPostRadius + mm(8);
const toothCenterX =
  rackFaceX + (toothLength / 2) * Math.cos(toothTilt) + (toothThickness / 2) * Math.sin(toothTilt);
const firstToothZ = sleeveTopZ - mm(9);
// Travel is a whole number of rack pitches, so the pawl nose sits in a tooth
// gap at both ends of travel.
const heightAdjustMm = param('heightAdjustMm', 0, { min: 0, max: 4 * rackPitchMm });

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

// Clearance slot through the sleeve mouth and collar for the rack backer and
// teeth, which ride down inside the sleeve at the lowest seat height.
function rackSlot() {
  const bottom = innerPostBaseZ + mm(2);
  const top = sleeveTopZ + mm(1);
  return box(mm(30), mm(10), top - bottom).translate(innerPostRadius - mm(1), mm(-5), bottom);
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
    .subtract(cylZ(sleeveHeight + mm(2), sleeveBoreRadius, baseZ - mm(1), 96))
    .subtract(rackSlot())
    .color('#22272b'),
);
outerSleeve.connector('height-rail', axisConnector([0, 0, innerPostBaseZ], [0, 0, 1]));
stool.mate('height-adjust', 'matte-black-outer-sleeve-guiding-telescoping-post.height-rail', 'bright-telescoping-inner-post-ending-below-seat-plate.height-slide', 'prismatic', {
  pose: heightAdjustMm.multiply(previewScale),
  limitsMm: [0, 4 * rackPitchMm],
});

const upperCollar = stool.part(
  'split-clamp-collar-at-top-of-sleeve',
  cylZ(collarHeight, collarRadius, sleeveTopZ - collarHeight, 96)
    .subtract(cylZ(collarHeight + mm(1), sleeveRadius + mm(1.4), sleeveTopZ - collarHeight - mm(0.5), 96))
    .subtract(rackSlot())
    .color('#353b40'),
);
fastenAt('split-collar-on-sleeve-mouth', outerSleeve, upperCollar, [0, 0, sleeveTopZ - collarHeight / 2]);

const rackBacker = stool.part(
  'vertical-ratchet-rack-backer-welded-to-inner-post',
  box(rackFaceX - innerPostRadius, mm(7), mm(72), true)
    .translate((innerPostRadius + rackFaceX) / 2, 0, sleeveTopZ + mm(22))
    .color('#c5c9cc'),
);
innerPost.connector('rack-weld-face', frameConnector([innerPostRadius, 0, sleeveTopZ + mm(22)]));
rackBacker.connector('post-weld-face', frameConnector([innerPostRadius, 0, sleeveTopZ + mm(22)]));
stool.mate('rack-to-post-weld', 'bright-telescoping-inner-post-ending-below-seat-plate.rack-weld-face', 'vertical-ratchet-rack-backer-welded-to-inner-post.post-weld-face', 'fastened');

for (let i = 0; i < 9; i += 1) {
  const z = firstToothZ + i * mm(rackPitchMm);
  const tooth = stool.part(
    `forward-facing-ratchet-tooth-${i + 1}`,
    box(toothLength, mm(9), toothThickness, true)
      .rotate([0, 1, 0], -toothTiltDeg)
      .translate(toothCenterX, 0, z)
      .color('#e1e4e6'),
  );
  rackBacker.connector(`tooth-${i + 1}-seat`, frameConnector([rackFaceX, 0, z]));
  tooth.connector('rack-seat', frameConnector([rackFaceX, 0, z]));
  stool.mate(`ratchet-tooth-${i + 1}-weld`, `vertical-ratchet-rack-backer-welded-to-inner-post.tooth-${i + 1}-seat`, `forward-facing-ratchet-tooth-${i + 1}.rack-seat`, 'fastened');
}

// Pawl group, all on the -Y side of the rack so the sliding teeth clear it.
// The pivot boss rests on the collar top, the lever rests on the boss, the
// return spring stands on the collar under the lever, and the nose reaches
// sideways from the lever into the gap between teeth 4 and 5.
const pivotRadius = mm(8);
const pivotCenter: [number, number] = [sleeveRadius + mm(3), sleeveTopZ + pivotRadius];
const pawlPivot = stool.part(
  'round-pawl-pivot-boss-on-sleeve',
  cylinder(mm(5.5), pivotRadius, 48)
    .alongAxis([0, 1, 0])
    .translate(pivotCenter[0], mm(-15.5), pivotCenter[1])
    .color('#41484e'),
);
fastenAt('pawl-pivot-on-sleeve', outerSleeve, pawlPivot, [pivotCenter[0], mm(-12), sleeveTopZ]);

const leverTiltDeg = 12;
const leverTilt = (leverTiltDeg * Math.PI) / 180;
const leverHalfThickness = mm(2.5);
const leverAxis: [number, number] = [Math.cos(leverTilt), -Math.sin(leverTilt)];
const leverNormal: [number, number] = [Math.sin(leverTilt), Math.cos(leverTilt)];
// Lever centre line: one boss radius plus half the lever thickness above the
// boss axis, measured along the lever normal, so the lever underside is
// tangent to the boss.
const leverTangent: [number, number] = [
  pivotCenter[0] + (pivotRadius + leverHalfThickness) * leverNormal[0],
  pivotCenter[1] + (pivotRadius + leverHalfThickness) * leverNormal[1],
];
function leverPoint(s: number, lift = 0): [number, number] {
  return [
    leverTangent[0] + s * leverAxis[0] + lift * leverNormal[0],
    leverTangent[1] + s * leverAxis[1] + lift * leverNormal[1],
  ];
}
const leverCenter = leverPoint(mm(19));
const pawlLever = stool.part(
  'curved-release-pawl-lever-biting-into-rack-teeth',
  box(mm(54), mm(7), leverHalfThickness * 2, true)
    .rotate([0, 1, 0], leverTiltDeg)
    .translate(leverCenter[0], mm(-9), leverCenter[1])
    .color('#59616a'),
);
const leverRest = leverPoint(0, -leverHalfThickness);
fastenAt('pawl-lever-on-pivot', pawlPivot, pawlLever, [leverRest[0], mm(-12), leverRest[1]]);

// Nose: a plate parallel to the teeth, centred on the mid-plane between
// teeth 4 and 5, thinner than the tooth gap, its side face on the lever side.
const noseThickness = mm(4);
const noseLength = mm(11);
const noseReach = mm(2);
const noseGapZ = firstToothZ + 3.5 * mm(rackPitchMm);
const noseCenter: [number, number] = [
  toothCenterX + noseReach * Math.cos(toothTilt),
  noseGapZ + noseReach * Math.sin(toothTilt),
];
const pawlNose = stool.part(
  'hardened-pawl-nose-seated-between-ratchet-teeth',
  box(noseLength, mm(5), noseThickness, true)
    .rotate([0, 1, 0], -toothTiltDeg)
    .translate(noseCenter[0], mm(-3), noseCenter[1])
    .color('#d3d7da'),
);
fastenAt('pawl-nose-on-lever', pawlLever, pawlNose, [noseCenter[0], mm(-5.5), noseCenter[1]]);

const knobRadius = mm(6);
const knobCenter = leverPoint(mm(41), leverHalfThickness + knobRadius);
const releaseKnob = stool.part(
  'small-red-thumb-tab-on-pawl-release-lever',
  cylinder(mm(8), knobRadius, 32)
    .alongAxis([0, 1, 0])
    .translate(knobCenter[0], mm(-13), knobCenter[1])
    .color('#b23a2f'),
);
const knobRest = leverPoint(mm(41), leverHalfThickness);
fastenAt('thumb-tab-on-lever', pawlLever, releaseKnob, [knobRest[0], mm(-9), knobRest[1]]);

// Return spring: stands on the collar top and ends on the lever underside.
const springX = sleeveRadius + mm(2.5);
const springTopZ =
  leverTangent[1] - leverHalfThickness / Math.cos(leverTilt) - (springX - leverTangent[0]) * Math.tan(leverTilt) +
  mm(-0.1);
const spring = stool.part(
  'visible-return-spring-from-collar-lug-to-pawl-lever',
  cylZ(springTopZ - sleeveTopZ, mm(1.5), sleeveTopZ, 16)
    .translate(springX, mm(-8), 0)
    .color('#b8bdc1'),
);
fastenAt('return-spring-on-collar', upperCollar, spring, [springX, mm(-8), sleeveTopZ]);

const footRing = stool.part(
  'circular-tubular-foot-ring-welded-around-lower-sleeve',
  torus(mm(54), footRingMinorRadius, 96)
    .translate(0, 0, footRingZ)
    .color('#4b545b'),
);

for (const deg of [45, 135, 225, 315]) {
  const top = radialPoint(mm(24), deg, legTopZ);
  const foot = radialPoint(mm(82), deg, legFootZ);
  const legSpec = tubeBetween(`splayed-tubular-leg-${deg}-degrees`, top, foot, legRadius, '#30373d');
  const leg = stool.part(legSpec.name, legSpec.shape);
  fastenAt(`splayed-leg-${deg}-on-sleeve`, outerSleeve, leg, top);

  const footPad = stool.part(
    `rubber-leveling-foot-pad-${deg}-degrees`,
    cylinder(footPadHeight, mm(10), 40)
      .translate(foot[0], foot[1], 0)
      .color('#1b1b1b'),
  );
  fastenAt(`foot-pad-${deg}-on-leg`, leg, footPad, foot);

  const ringStrutSpec = tubeBetween(
    `short-foot-ring-support-strut-${deg}-degrees`,
    radialPoint(sleeveRadius, deg, footRingZ),
    radialPoint(mm(54) - footRingMinorRadius, deg, footRingZ),
    mm(2.5),
    '#4b545b',
  );
  const ringStrut = stool.part(ringStrutSpec.name, ringStrutSpec.shape);
  fastenAt(`ring-strut-${deg}-on-sleeve`, outerSleeve, ringStrut, radialPoint(mm(36), deg, footRingZ));
  // The ring is welded to the struts, which carry it to the sleeve.
  if (deg === 45) {
    fastenAt('foot-ring-on-strut', ringStrut, footRing, radialPoint(mm(54) - footRingMinorRadius, deg, footRingZ));
  }
}

return stool.model();
