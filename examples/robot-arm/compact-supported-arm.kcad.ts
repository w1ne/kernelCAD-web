// Compact 4-DOF desktop arm. Printed PETG structure, four envelope-level
// purchased actuators (55 g each), and a compound geared pincer.
//
// Every part is authored in its own joint frame. Fastened mates align
// connector origins and keep local axes parallel, so a child is rotated
// here until its output axis already points the right way. Pitch is +Y:
// a positive angle sends local +X toward -Z.
//
// Gear stages are module 0.6, 19/38 external and 57/114 internal, on a
// 17.1 mm centre. Trapezoid teeth are one extruded outline per gear.
// Tip circles are pulled back 0.125 mm each (0.25 mm combined) so the
// mesh stays clear when a curl is sampled apart from the grip.

const baseYawDeg = param('baseYawDeg', 18, { min: -55, max: 55 });
const shoulderPitchDeg = param('shoulderPitchDeg', 28, { min: 12, max: 40 });
const elbowPitchDeg = param('elbowPitchDeg', -34, { min: -58, max: 12 });
const gripDeg = param('gripDeg', 10, { min: 0, max: 28 });

const UPPER = 126;
const FORE = 112;
const SHOULDER_Z = 140;
const GRIP_X = 16;
const HINGE_Y = 17.1;
const FINGER = 42;
const CHEEK_GAP = 6.6;
const TONGUE_HALF = 6.25;
const SERVO_FACE_Y = 27.2;

const arm = assembly('compact supported robot arm');

const INK = {
  base: '#2b3036',
  link: '#4c6274',
  servo: '#17191b',
  finger: '#e07a3d',
  pad: '#2a2a2a',
  gear: '#2c3328',
};

function coat(shape, hex) {
  // Leaf finishes of the same stock that overlap fail union.member-overlap.
  // paint() colors the finished solid once.
  return hex === undefined ? shape : shape;
}

function paint(shape, hex) {
  return shape.finish('abs', { color: hex });
}

function fuse(shapes) {
  return shapes.slice(1).reduce((acc, shape) => acc.union(shape), shapes[0]);
}

function at(shapes, x, y, z) {
  return shapes.map((shape) => shape.translate(x, y, z));
}

function rodZ(z0, z1, r, seg) {
  return cylinder(z1 - z0, r, seg ?? 20).translate(0, 0, z0);
}

function rodY(y0, y1, r, seg) {
  return cylinder(y1 - y0, r, seg ?? 18).alongAxis([0, 1, 0]).translate(0, y0, 0);
}

function rodX(x0, x1, r, seg) {
  return cylinder(x1 - x0, r, seg ?? 16).alongAxis([1, 0, 0]).translate(x0, 0, 0);
}

function slab(x0, x1, y0, y1, z0, z1, hex) {
  return coat(box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0), hex);
}

function pushPt(pts, x, y) {
  const last = pts[pts.length - 1];
  if (last !== undefined && (last[0] - x) ** 2 + (last[1] - y) ** 2 < 1e-4) return;
  pts.push([x, y]);
}

// Four broad flutes. A dense spline blows the sweep face budget, and these
// stay inside the horn bore (outer radius about 4.6, bore 5.05).
function outputFlutes() {
  const flutes = [];
  for (let i = 0; i < 4; i++) {
    flutes.push(box(2.05, 1.35, 2.3).translate(2.5, -0.675, 2.5).rotateZ(i * 90));
  }
  return flutes;
}

// Purchased-actuator envelope. Output face at z = 0, body toward -Z.
// Ears sit just below the face so a printed seat can land under the tabs.
function sts3215Envelope() {
  const body = coat(extrudeRoundedRect(30, 20, 3.2, 35.6).translate(0, 0, -35.6), INK.servo);
  const ears = coat(extrudeRoundedRect(45.2, 24.7, 2.2, 3.4).translate(0, 0, -4.55), INK.servo);
  const hub = coat(rodZ(-0.15, 0.75, 6.6, 14), INK.servo);
  // Narrow stalk bridges the case to the pilot through the horn bore.
  const stalk = coat(rodZ(0.4, 1.85, 3.4, 12), INK.servo);
  const pilot = coat(rodZ(1.5, 4.7, 3.9, 10), INK.servo);
  // Strain-relief boot on the cable face. Overlaps the case by 0.6 mm.
  const boot = coat(
    extrudeRoundedRect(7.2, 5.0, 1.5, 6.4, { axis: 'y' }).translate(0, -15.8, -25.2),
    INK.servo,
  );
  const grommet = coat(rodY(-13.5, -11.15, 3.85, 12).translate(0, 0, -25.2), INK.servo);
  const holes = [-1, 1].flatMap((sx) => [-1, 1].map((sy) =>
    rodZ(-4.7, 0.35, 1.15, 8).translate(sx * 18.5, sy * 6, 0)));
  return paint(fuse([
    body, ears, hub, stalk, pilot, ...outputFlutes(), boot, grommet,
  ]).subtract(fuse(holes)), INK.servo);
}

// Pitch radius minus 0.125 mm on an external tooth, plus 0.125 mm on an
// internal tooth. The two tip circles then miss by 0.25 mm at every angle.
const P19 = (19 * 0.6) / 2;
const P38 = (38 * 0.6) / 2;
const P57 = (57 * 0.6) / 2;
const P114 = (114 * 0.6) / 2;
const TIP19 = P19 - 0.125;
const TIP38 = P38 - 0.125;
const TIP57 = P57 - 0.125;
const TIP114 = P114 + 0.125;

function externalGearPoints(teeth, rootR, tipR, phase, a0, a1) {
  const pitch = (2 * Math.PI) / teeth;
  const half = pitch * 0.18;
  const pts = [];
  const full = a0 === undefined;
  for (let i = 0; i < teeth; i++) {
    let mid = phase + i * pitch;
    if (!full) {
      while (mid < a0) mid += Math.PI * 2;
      while (mid >= a0 + Math.PI * 2) mid -= Math.PI * 2;
      if (mid < a0 + half || mid > a1 - half) continue;
    }
    const a = mid - half;
    const b = mid + half;
    pushPt(pts, rootR * Math.cos(a), rootR * Math.sin(a));
    pushPt(pts, tipR * Math.cos(a), tipR * Math.sin(a));
    pushPt(pts, tipR * Math.cos(b), tipR * Math.sin(b));
    pushPt(pts, rootR * Math.cos(b), rootR * Math.sin(b));
  }
  return pts;
}

function internalSectorPoints(tipR, gulletR, backR, a0, a1, teeth, phase) {
  const pitch = (2 * Math.PI) / teeth;
  const half = pitch * 0.18;
  const pts = [];
  const steps = Math.max(6, Math.ceil((a1 - a0) / 0.18));
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pushPt(pts, backR * Math.cos(a), backR * Math.sin(a));
  }
  pushPt(pts, gulletR * Math.cos(a1), gulletR * Math.sin(a1));
  const mids = [];
  for (let i = 0; i < teeth; i++) {
    let mid = phase + i * pitch;
    while (mid < a0) mid += Math.PI * 2;
    while (mid >= a0 + Math.PI * 2) mid -= Math.PI * 2;
    if (mid > a0 + half && mid < a1 - half) mids.push(mid);
  }
  mids.sort((p, q) => q - p);
  for (const mid of mids) {
    const lead = mid + half;
    const trail = mid - half;
    pushPt(pts, gulletR * Math.cos(lead), gulletR * Math.sin(lead));
    pushPt(pts, tipR * Math.cos(lead), tipR * Math.sin(lead));
    pushPt(pts, tipR * Math.cos(trail), tipR * Math.sin(trail));
    pushPt(pts, gulletR * Math.cos(trail), gulletR * Math.sin(trail));
  }
  pushPt(pts, gulletR * Math.cos(a0), gulletR * Math.sin(a0));
  return pts;
}

function gearBlank(points, z0, z1, hex) {
  return coat(extrudePolygon(points, z1 - z0).translate(0, 0, z0), hex);
}

function annular(rIn, rOut, a0, a1, z0, z1, hex) {
  const pts = [];
  const steps = Math.max(4, Math.ceil((a1 - a0) / 0.2));
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pushPt(pts, rOut * Math.cos(a), rOut * Math.sin(a));
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pushPt(pts, rIn * Math.cos(a), rIn * Math.sin(a));
  }
  return gearBlank(pts, z0, z1, hex);
}

function radialWall(r0, r1, angle, half, z0, z1, hex) {
  const pts = [angle - half, angle + half].flatMap((a, index) => {
    const radius = index === 0 ? [r0, r1] : [r1, r0];
    return radius.map((r) => [r * Math.cos(a), r * Math.sin(a)]);
  });
  return gearBlank(pts, z0, z1, hex);
}

// Y axis through the origin. Disc outboard of the +Y cheek. The spline
// bore is open toward the servo pilot; four clamp screws sit in the disc.
function pitchHorn() {
  const spindle = rodY(-20.5, 22.4, 3, 14);
  // Collar is outboard of the cheek bore and larger than the spline bore,
  // so the disc stays attached to the spindle.
  const collar = rodY(21.38, 24.2, 6.9, 14);
  const disc = rodY(21.45, 26.15, 9.95, 20);
  const bore = rodY(21.85, 26.25, 5.05, 14);
  const holes = [-1, 1].flatMap((sx) => [-1, 1].map((sz) =>
    rodY(21.35, 24.85, 1.55, 8).translate(sx * 6.2, 0, sz * 6.2)));
  const heads = [-1, 1].flatMap((sx) => [-1, 1].map((sz) =>
    rodY(24.95, 26.25, 1.85, 10).translate(sx * 6.2, 0, sz * 6.2)));
  return fuse([spindle, collar, disc, ...heads]).subtract(fuse([bore, ...holes]));
}

// Open yoke in the joint frame. Output face at y = SERVO_FACE_Y, body
// toward +Y. A round neck stops before the horn disc. Side ribs and ear
// ledges stay outside the case silhouette so the ears, spline side, and
// cable boot remain visible. Cheek bores are cut with the yoke.
function pitchPocket(hex) {
  const neck = coat(rodY(16.5, 22.15, 12.6, 16), hex);
  const sideRib = (x0, x1) => coat(slab(x0, x1, 18.5, 26.95, -3.2, 3.2, hex), hex);
  const ledge = (x0, x1, z0, z1) => coat(slab(x0, x1, 26.35, 28.05, z0, z1, hex), hex);
  const positives = [
    neck,
    sideRib(10.9, 17.2),
    sideRib(-17.2, -10.9),
    ledge(15.8, 22.3, -5.2, 5.2),
    ledge(-22.3, -15.8, -5.2, 5.2),
  ];
  const cutters = [
    rodY(-21.5, -6.05, 3.45, 12),
    rodY(6.05, 21.45, 3.45, 12),
    rodY(21.2, 27.15, 10.55, 16),
  ];
  return { positives, cutters };
}

// --- base -----------------------------------------------------------------

const basePlate = arm.part('base-plate', (() => {
  const plate = coat(extrudeRoundedRect(156, 130, 12, 8), INK.base);
  const foot = coat(rodZ(6.4, 13.5, 46, 24), INK.base);
  const tower = coat(rodZ(8, 39.2, 38, 28), INK.base);
  // Stationary race: a lip with a groove, then a journal the skirt clears.
  const raceLip = coat(rodZ(38.6, 44.3, 36.6, 28), INK.base);
  const journal = coat(rodZ(42.8, 52.2, 29.7, 24), INK.base);
  const raceGroove = rodZ(40.5, 42.7, 37.1, 24).subtract(rodZ(40.3, 42.9, 33.2, 24));
  const bodyPocket = box(31, 21, 36.6).translate(-15.5, -10.5, 15.8);
  const earPocket = box(46.4, 25.6, 6.2).translate(-23.2, -12.8, 47.1);
  const hubBore = rodZ(51.2, 54, 7.4, 16);
  const cable = box(12, 14, 18).translate(-6, -24, 22);
  const window = box(24, 14, 14).translate(15.4, -7, 21);
  const desk = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sy) => {
    const x = sx * 62;
    const y = sy * 48;
    return [
      rodZ(-0.4, 8.5, 2.25, 10).translate(x, y, 0),
      rodZ(4.8, 8.6, 4, 12).translate(x, y, 0),
    ];
  }));
  return paint(fuse([plate, foot, tower, raceLip, journal]).subtract(fuse([
    bodyPocket, earPocket, hubBore, cable, window, raceGroove, ...desk,
  ])), INK.base);
})(), { material: 'petg' });

const baseYawServo = arm.part('base-yaw-servo', sts3215Envelope(), {
  material: 'petg',
  massKg: 0.055,
});

const baseYawOutput = arm.part('base-yaw-output', (() => {
  const hub = rodZ(2.35, 8.9, 5.15, 16);
  const disc = rodZ(4.55, 9.05, 9.95, 20);
  const bore = rodZ(1.65, 9.4, 5.05, 12);
  const holes = [-1, 1].flatMap((sx) => [-1, 1].map((sy) =>
    rodZ(4.3, 9.2, 1.55, 8).translate(sx * 6.2, sy * 6.2, 0)));
  return fuse([hub, disc]).subtract(fuse([bore, ...holes]));
})(), { material: 'aluminum-6061' });

const yawTurret = arm.part('yaw-turret', (() => {
  const hex = INK.link;
  const flange = coat(rodZ(0.75, 8.7, 41, 28), hex);
  const skirt = coat(
    rodZ(-7.2, 1.35, 35.2, 28).subtract(rodZ(-7.5, 0.8, 30.35, 28)),
    hex,
  );
  const skirtGroove = rodZ(-4.55, -2.55, 35.6, 24).subtract(rodZ(-4.75, -2.35, 33.5, 24));
  const column = coat(extrudeRoundedRect(54, 42, 6, 102).translate(0, 0, 8), hex);
  const columnVoid = box(46, 34, 90).translate(-23, -17, 16);
  // The beam stays inside |y| <= 13. Open the column cap there so a 40°
  // shoulder clears it; the cheek gussets remain on the walls outside.
  const capRelief = box(56, 28, 18).translate(-28, -14, 100);
  const cable = box(10, 8, 78).translate(-5, -22, 24);
  const cheek = (y0, len) => coat(
    rodY(y0, y0 + len, 13.6, 16).translate(0, 0, SHOULDER_Z),
    hex,
  );
  const cap = coat(rodY(-23.5, -20.65, 8.5, 14).translate(0, 0, SHOULDER_Z), hex);
  const pocket = pitchPocket(hex);
  // Gussets sit outside the upper-link beam (|y| <= 13 at every pitch)
  // and tie the column top to the shoulder cheeks.
  const gusset = (y0, y1) => slab(-12, 12, y0, y1, 104, 136, hex);
  const bolts = [0, 1, 2, 3].flatMap((i) => {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const x = Math.cos(a) * 36;
    const y = Math.sin(a) * 36;
    return [rodZ(5.6, 9.2, 3.1, 8).translate(x, y, 0)];
  });
  const positives = [
    flange, skirt, column,
    cheek(-20.8, 14.2), cheek(CHEEK_GAP, 15),
    cap,
    gusset(14.2, 20.4), gusset(-20.4, -14.2),
    ...at(pocket.positives, 0, 0, SHOULDER_Z),
  ];
  const cutters = [
    columnVoid, capRelief, cable, skirtGroove,
    rodZ(0.45, 10.2, 5.85, 16),
    rodZ(0.4, 2.15, 7.45, 16),
    rodZ(4.2, 9.4, 10.75, 20),
    rodY(-23.7, -20.4, 3.75, 10).translate(0, 0, SHOULDER_Z),
    ...bolts,
    ...at(pocket.cutters, 0, 0, SHOULDER_Z),
  ];
  return paint(fuse(positives).subtract(fuse(cutters)), hex);
})(), { material: 'petg' });

const shoulderPitchServo = arm.part(
  'shoulder-pitch-servo',
  sts3215Envelope().rotateX(90),
  { material: 'petg', massKg: 0.055 },
);

const shoulderPitchShaft = arm.part('shoulder-pitch-shaft', pitchHorn(), {
  material: 'aluminum-6061',
});

// --- upper link, elbow ----------------------------------------------------

const upperLink = arm.part('upper-link', (() => {
  const hex = INK.link;
  const tongue = coat(rodY(-TONGUE_HALF, TONGUE_HALF, 16, 20), hex);
  const neck = coat(extrudeRoundedRect(11.2, 15, 2.4, 16, { axis: 'x' }).translate(6, 0, 0), hex);
  const flare = coat(extrudeRoundedRect(18, 17, 3.6, 14, { axis: 'x' }).translate(16, 0, 0), hex);
  const beam = coat(extrudeRoundedRect(26, 20, 6, 84, { axis: 'x' }).translate(22, 0, 0), hex);
  const beamVoid = box(74, 15, 11).translate(32, -7.5, -5.5);
  const cable = rodX(38, 96, 2.1, 8).translate(0, 0, 10.35);
  const bridge = (y0, y1) => slab(102, 130, y0, y1, -10, 10, hex);
  const cheek = (y0, len) => coat(rodY(y0, y0 + len, 14.2, 16).translate(UPPER, 0, 0), hex);
  const cap = coat(rodY(-24.3, -21.45, 8.6, 14).translate(UPPER, 0, 0), hex);
  const pocket = pitchPocket(hex);
  const positives = [
    tongue, neck, flare, beam,
    bridge(-14, -CHEEK_GAP), bridge(CHEEK_GAP, 14),
    cheek(-21.6, 15), cheek(CHEEK_GAP, 15),
    cap,
    ...at(pocket.positives, UPPER, 0, 0),
  ];
  const cutters = [
    beamVoid, cable,
    rodY(-8, 8, 3.45, 10),
    rodY(-24.5, -21.2, 3.75, 10).translate(UPPER, 0, 0),
    ...at(pocket.cutters, UPPER, 0, 0),
  ];
  return paint(fuse(positives).subtract(fuse(cutters)), hex);
})(), { material: 'petg' });

const elbowPitchServo = arm.part(
  'elbow-pitch-servo',
  sts3215Envelope().rotateX(90).translate(UPPER, 0, 0),
  { material: 'petg', massKg: 0.055 },
);

const elbowPitchShaft = arm.part('elbow-pitch-shaft', pitchHorn(), {
  material: 'aluminum-6061',
});

const forearmLink = arm.part('forearm-link', (() => {
  const hex = INK.link;
  const tongue = coat(rodY(-TONGUE_HALF, TONGUE_HALF, 15, 18), hex);
  const neck = coat(extrudeRoundedRect(10.4, 13.6, 2.2, 14, { axis: 'x' }).translate(7, 0, 0), hex);
  const flare = coat(extrudeRoundedRect(16, 14.5, 3.2, 12, { axis: 'x' }).translate(18, 0, 0), hex);
  const beam = coat(extrudeRoundedRect(22, 16, 4.5, 80, { axis: 'x' }).translate(20, 0, 0), hex);
  // Solid through local [80, 0, 0]. A top groove is the cable race.
  const cable = rodX(34, 90, 1.85, 8).translate(0, 0, 8.2);
  const palmFlange = coat(extrudeRoundedRect(40, 26, 3, 15.6, { axis: 'x' }).translate(96, 0, 0), hex);
  const pinionClear = rodZ(6.85, 10.5, 17.4, 24).translate(FORE + GRIP_X, 0, 0);
  const holes = [-1, 1].flatMap((sy) => [-1, 1].map((sz) =>
    rodX(95, 112.1, 1.6, 8).translate(0, sy * 9, sz * 8)));
  return paint(fuse([tongue, neck, flare, beam, palmFlange]).subtract(fuse([
    rodY(-8, 8, 3.45, 10),
    cable,
    pinionClear,
    ...holes,
  ])), hex);
})(), { material: 'petg' });

// --- gripper --------------------------------------------------------------

const GEAR_LO_Z0 = -10.8;
const GEAR_LO_Z1 = -7.8;
const GEAR_HI_Z0 = 7.2;
const GEAR_HI_Z1 = 10.2;

const toolPalm = arm.part('tool-palm', (() => {
  const hex = INK.link;
  const rear = slab(0.08, 5.2, -34, 34, -15.2, 16.9, hex);
  const floor = slab(3, 50, -30, 30, -14.9, -11.75, hex);
  const lug = (y, z0, z1) => coat(rodZ(z0, z1, 7.5, 18).translate(GRIP_X, y, 0), hex);
  const lugBore = (y, z0, z1) => rodZ(z0 - 0.25, z1 + 0.25, 2.8, 12).translate(GRIP_X, y, 0);
  const sleeve = coat(rodZ(-6.5, 6.55, 7.05, 20).translate(GRIP_X, 0, 0), hex);
  const sleeveBore = rodZ(-6.8, 6.85, 3.45, 16).translate(GRIP_X, 0, 0);
  const sleeveRib = slab(GRIP_X + 6.3, GRIP_X + 12, -3.2, 3.2, -14.6, -6.1, hex);
  const cup = coat(rodZ(10.55, 12.85, 12.4, 20).translate(GRIP_X, 0, 0), hex);
  const cupBore = rodZ(10.3, 13.05, 7.15, 16).translate(GRIP_X, 0, 0);
  const plate = slab(GRIP_X - 24, GRIP_X + 24, -13.2, 13.2, 14.3, 16.85, hex);
  const plateHole = rodZ(13.9, 17.2, 10.3, 20).translate(GRIP_X, 0, 0);
  const earY = (y0, y1) => slab(GRIP_X - 23, GRIP_X + 23, y0, y1, 16.45, 17.85, hex);
  const earX = (x0, x1) => slab(x0, x1, -12.2, 12.2, 16.45, 17.85, hex);
  const pillarFoot = (y0, y1) => slab(GRIP_X - 6, GRIP_X + 6, y0, y1, -14.8, -11.7, hex);
  const pillar = (y0, y1) => slab(GRIP_X - 5, GRIP_X + 6, y0, y1, -14.5, 16.5, hex);
  const scallop = rodZ(6.7, 10.65, 17.5, 28).translate(GRIP_X, 0, 0);
  // Swing room for the internal sector at full right-curl. The rear wall
  // stays below the sector and on the far side of this notch.
  const sectorNotch = box(8, 12, 4.2).translate(-0.4, 12, 6.7);
  const positives = [
    rear, floor, sleeve, sleeveRib, cup, plate,
    lug(HINGE_Y, -15.15, -11.6), lug(HINGE_Y, 2.15, 6.55),
    lug(-HINGE_Y, -15.15, -11.6), lug(-HINGE_Y, 2.15, 6.55),
    pillarFoot(21.8, 28.5), pillar(25.9, 32.2),
    pillarFoot(-28.5, -21.8), pillar(-32.2, -25.9),
    earY(10.55, 12.35), earY(-12.35, -10.55),
    earX(GRIP_X - 23.2, GRIP_X - 15.55), earX(GRIP_X + 15.55, GRIP_X + 23.2),
    slab(0.05, 6.6, -5, 5, 12.2, 16.9, hex),
    // Upper lugs sit above the finger hubs. Webs tie them to the sleeve
    // and the pillars without entering the hub.
    slab(GRIP_X - 5, GRIP_X + 5, 5.2, 12.4, 2.4, 6.3, hex),
    slab(GRIP_X - 5, GRIP_X + 5, -12.4, -5.2, 2.4, 6.3, hex),
    slab(GRIP_X - 4, GRIP_X + 5, 23.8, 27.2, 2.3, 6.4, hex),
    slab(GRIP_X - 4, GRIP_X + 5, -27.2, -23.8, 2.3, 6.4, hex),
  ];
  const cutters = [
    sleeveBore, cupBore, plateHole, scallop, sectorNotch,
    lugBore(HINGE_Y, -15.15, -11.6), lugBore(HINGE_Y, 2.15, 6.55),
    lugBore(-HINGE_Y, -15.15, -11.6), lugBore(-HINGE_Y, 2.15, 6.55),
  ];
  return paint(fuse(positives).subtract(fuse(cutters)), hex);
})(), { material: 'petg' });

const gripServo = arm.part(
  'grip-servo',
  sts3215Envelope().rotateX(180).translate(GRIP_X, 0, 17.05),
  { material: 'petg', massKg: 0.055 },
);

const gripJournal = rodZ(-9.3, 8.95, 2.85, 16).translate(GRIP_X, 0, 0);
const gripNeck = rodZ(9.55, 13.7, 6.4, 16).translate(GRIP_X, 0, 0);
const gripCoupler = rodZ(13.15, 16.7, 8.8, 20).translate(GRIP_X, 0, 0);
const gripPilotBore = rodZ(11.5, 15.25, 5.1, 16).translate(GRIP_X, 0, 0);
const gripHubBore = rodZ(14.95, 16.95, 7.3, 16).translate(GRIP_X, 0, 0);
// Tooth sectors use the 19T and 57T pitch. A root disk closes each
// sector so the blank stays one solid without a full ring of teeth.
const pinion19 = fuse([
  gearBlank(
    externalGearPoints(19, 4.7, TIP19, 0.2, -Math.PI / 2 - 1.15, -Math.PI / 2 + 1.15),
    GEAR_LO_Z0, GEAR_LO_Z1, INK.gear,
  ),
  coat(rodZ(GEAR_LO_Z0, GEAR_LO_Z1, 5.15, 16), INK.gear),
]).translate(GRIP_X, 0, 0);
const pinion57 = fuse([
  gearBlank(
    externalGearPoints(57, 5.4, TIP57, -0.08, -Math.PI / 2 - 1.35, -Math.PI / 2 + 1.35),
    GEAR_HI_Z0, GEAR_HI_Z1, INK.gear,
  ),
  coat(rodZ(GEAR_HI_Z0, GEAR_HI_Z1, 6.05, 16), INK.gear),
]).translate(GRIP_X, 0, 0);

const gripDriver = arm.part('grip-driver', paint(fuse([
  coat(gripJournal, INK.gear),
  coat(gripNeck, INK.gear),
  coat(gripCoupler, INK.gear),
  pinion19,
  pinion57,
]).subtract(fuse([gripPilotBore, gripHubBore])), INK.gear), { material: 'petg' });

function hingePin() {
  const shank = rodZ(-15.95, 6.95, 2.45, 14);
  const head = rodZ(-17.55, -15.5, 4.15, 14);
  return fuse([coat(shank, '#c5c8cc'), coat(head, '#c5c8cc')]);
}

const leftHingePin = arm.part(
  'left-hinge-pin',
  hingePin().translate(GRIP_X, HINGE_Y, 0),
  { material: 'mild-steel' },
);
const rightHingePin = arm.part(
  'right-hinge-pin',
  hingePin().translate(GRIP_X, -HINGE_Y, 0),
  { material: 'mild-steel' },
);

const LEFT_SECTOR_A0 = -Math.PI / 2 - 0.85;
const LEFT_SECTOR_A1 = -Math.PI / 2 + 0.85;
const RIGHT_SECTOR_A0 = 0.48;
const RIGHT_SECTOR_A1 = 1.62;

// sign +1 is the left jaw (inward face toward -Y). The right jaw is the
// same section mirrored through XZ.
function fingerJaw(sign) {
  const beam = coat(
    extrudeRoundedRect(8.6, 8.4, 2.0, 28, { axis: 'x' }).translate(5.5, sign * 1.05, -2.45),
    INK.finger,
  );
  const nose = coat(
    extrudeRoundedRect(6.6, 8.4, 1.8, 12.5, { axis: 'x' }).translate(30, sign * 0.55, -1.35),
    INK.finger,
  );
  const knuckle = coat(rodZ(-10.7, 1.6, 8.35, 16), INK.finger);
  return { beam, nose, knuckle };
}

const leftFingerParts = (() => {
  const hub = coat(rodZ(-11.25, 1.75, 8, 16), INK.finger);
  const hubBore = rodZ(-11.6, 2.05, 2.8, 12);
  const jaw = fingerJaw(1);
  const slotMouth = box(26, 2.3, 2.5).translate(9, -3.55, -1.4);
  const slotBulb = box(24, 1.2, 2.7).translate(10, -2.25, -1.6);
  const sector = gearBlank(
    externalGearPoints(38, 7.05, TIP38, -Math.PI / 2, LEFT_SECTOR_A0, LEFT_SECTOR_A1),
    GEAR_LO_Z0, GEAR_LO_Z1, INK.finger,
  );
  return { hub, hubBore, jaw, slotMouth, slotBulb, sector };
})();

const rightFingerParts = (() => {
  const hub = coat(rodZ(-11.25, 1.75, 8, 16), INK.finger);
  const hubBore = rodZ(-11.6, 2.05, 2.8, 12);
  const jaw = fingerJaw(-1);
  const slotMouth = box(26, 2.3, 2.5).translate(9, 1.25, -1.4);
  const slotBulb = box(24, 1.2, 2.7).translate(10, 1.05, -1.6);
  const sector = gearBlank(
    internalSectorPoints(TIP114, 35.2, 36.7, RIGHT_SECTOR_A0, RIGHT_SECTOR_A1, 114, Math.PI / 2),
    GEAR_HI_Z0, GEAR_HI_Z1, INK.finger,
  );
  // The internal sector sits above the palm bearing. The riser stops below
  // the 57T blank; the arm that crosses that blank stays outside its tip.
  const hubTab = radialWall(5.6, 9.6, 0.12, 0.12, 1.25, 1.95, INK.finger);
  const lowRiser = radialWall(8.4, 20, 0.08, 0.07, 1.2, 7.05, INK.finger);
  const highArm = radialWall(18, 36.6, 0.08, 0.12, 6.7, 7.55, INK.finger);
  const outerArc = annular(34.6, 36.9, -0.05, 0.7, 7.2, 7.9, INK.finger);
  return {
    hub, hubBore, jaw, slotMouth, slotBulb, sector,
    hubTab, lowRiser, highArm, outerArc,
  };
})();

const leftFinger = arm.part('left-finger', paint(fuse([
  leftFingerParts.hub, leftFingerParts.jaw.beam, leftFingerParts.jaw.nose,
  leftFingerParts.jaw.knuckle, leftFingerParts.sector,
]).subtract(fuse([leftFingerParts.hubBore, leftFingerParts.slotMouth, leftFingerParts.slotBulb])), INK.finger), {
  material: 'petg',
});

const rightFinger = arm.part('right-finger', paint(fuse([
  rightFingerParts.hub, rightFingerParts.jaw.beam, rightFingerParts.jaw.nose,
  rightFingerParts.jaw.knuckle, rightFingerParts.sector,
  rightFingerParts.hubTab, rightFingerParts.lowRiser,
  rightFingerParts.highArm, rightFingerParts.outerArc,
]).subtract(fuse([rightFingerParts.hubBore, rightFingerParts.slotMouth, rightFingerParts.slotBulb])), INK.finger), {
  material: 'petg',
});

function fingerPad(side) {
  const inward = side < 0;
  const body = inward
    ? slab(8, 40.4, -6.4, -3.55, -4.6, 2.6, INK.pad)
    : slab(8, 40.4, 3.55, 6.4, -4.6, 2.6, INK.pad);
  const neck = inward
    ? slab(10, 34, -3.75, -1.45, -1.15, 1.05, INK.pad)
    : slab(10, 34, 1.45, 3.75, -1.15, 1.05, INK.pad);
  const bulb = inward
    ? slab(10, 34, -2.15, -1.45, -1.55, 1.05, INK.pad)
    : slab(10, 34, 1.45, 2.15, -1.55, 1.05, INK.pad);
  const ribs = [14, 23, 32].map((x) => (inward
    ? slab(x, x + 2.3, -7.05, -6.15, -2.7, 1.6, INK.pad)
    : slab(x, x + 2.3, 6.15, 7.05, -2.7, 1.6, INK.pad)));
  return paint(fuse([body, neck, bulb, ...ribs]), INK.pad);
}

const leftFingerPad = arm.part('left-finger-pad', fingerPad(-1), { density: 1150 });
const rightFingerPad = arm.part('right-finger-pad', fingerPad(1), { density: 1150 });

// --- connectors -----------------------------------------------------------

const axisZ = (origin, clearance) => ({
  type: 'axis',
  origin: { kind: 'vec3', value: origin },
  axis: [0, 0, 1],
  jointClearanceRadius: clearance,
});
const axisY = (origin, clearance) => ({
  type: 'axis',
  origin: { kind: 'vec3', value: origin },
  axis: [0, 1, 0],
  jointClearanceRadius: clearance,
});
const frameAt = (origin, normal) => ({
  type: 'frame',
  origin: { kind: 'vec3', value: origin },
  normal: normal ?? [0, 0, 1],
});

basePlate.connector('servo-mount', frameAt([0, 0, 52]));
baseYawServo
  .connector('mount', frameAt([0, 0, 0]))
  .connector('output', axisZ([0, 0, 0], 5));
baseYawOutput
  .connector('axis', axisZ([0, 0, 0], 5))
  .connector('turret-mount', frameAt([0, 0, 0]));
yawTurret
  .connector('yaw-in', axisZ([0, 0, 0], 5.2))
  .connector('horn-seat', frameAt([0, 0, 0]))
  .connector('shoulder-servo-mount', frameAt([0, SERVO_FACE_Y, SHOULDER_Z], [0, 1, 0]))
  .connector('shoulder-out', axisY([0, 0, SHOULDER_Z], 3.4));
shoulderPitchServo.connector('mount', frameAt([0, 0, 0], [0, -1, 0]));
shoulderPitchShaft
  .connector('mount', frameAt([0, 0, 0], [0, 1, 0]))
  .connector('axis', axisY([0, 0, 0], 3));
upperLink
  .connector('shoulder-in', axisY([0, 0, 0], 3.4))
  .connector('shaft-mount', frameAt([0, 0, 0], [0, 1, 0]))
  .connector('elbow-servo-mount', frameAt([UPPER, SERVO_FACE_Y, 0], [0, 1, 0]))
  .connector('elbow-out', axisY([UPPER, 0, 0], 3.4));
elbowPitchServo.connector('mount', frameAt([UPPER, 0, 0], [0, -1, 0]));
elbowPitchShaft
  .connector('mount', frameAt([0, 0, 0], [0, 1, 0]))
  .connector('axis', axisY([0, 0, 0], 3));
forearmLink
  .connector('elbow-in', axisY([0, 0, 0], 3.4))
  .connector('shaft-mount', frameAt([0, 0, 0], [0, 1, 0]))
  .connector('palm-mount', frameAt([FORE, 0, 0], [1, 0, 0]));
toolPalm
  .connector('mount', frameAt([0, 0, 0], [1, 0, 0]))
  .connector('grip-servo-mount', frameAt([GRIP_X, 0, 17.05]))
  .connector('grip-axis', axisZ([GRIP_X, 0, 0], 3.45))
  .connector('left-pin-mount', frameAt([GRIP_X, HINGE_Y, 0]))
  .connector('right-pin-mount', frameAt([GRIP_X, -HINGE_Y, 0]))
  .connector('left-hinge', axisZ([GRIP_X, HINGE_Y, 0], 2.8))
  .connector('right-hinge', axisZ([GRIP_X, -HINGE_Y, 0], 2.8))
  .connector('tool-tip', frameAt([GRIP_X + FINGER, 0, 0], [1, 0, 0]));
gripServo.connector('mount', frameAt([GRIP_X, 0, 17.05]));
gripDriver.connector('axis', axisZ([GRIP_X, 0, 0], 3.2));
leftHingePin
  .connector('mount', frameAt([GRIP_X, HINGE_Y, 0]))
  .connector('axis', axisZ([GRIP_X, HINGE_Y, 0], 2.45));
rightHingePin
  .connector('mount', frameAt([GRIP_X, -HINGE_Y, 0]))
  .connector('axis', axisZ([GRIP_X, -HINGE_Y, 0], 2.45));
leftFinger
  .connector('hinge', axisZ([0, 0, 0], 2.8))
  .connector('pad-mount', frameAt([22, -4.2, 0], [0, -1, 0]))
  .connector('tip', frameAt([FINGER, 0, 0], [1, 0, 0]));
rightFinger
  .connector('hinge', axisZ([0, 0, 0], 2.8))
  .connector('pad-mount', frameAt([22, 4.2, 0], [0, 1, 0]))
  .connector('tip', frameAt([FINGER, 0, 0], [1, 0, 0]));
leftFingerPad.connector('mount', frameAt([22, -4.2, 0], [0, -1, 0]));
rightFingerPad.connector('mount', frameAt([22, 4.2, 0], [0, 1, 0]));

// --- mates ----------------------------------------------------------------

arm.mate('base-servo-fix', 'base-plate.servo-mount', 'base-yaw-servo.mount', 'fastened');
arm.mate('yaw-turret-fix', 'base-yaw-output.turret-mount', 'yaw-turret.horn-seat', 'fastened');
arm.mate('shoulder-servo-fix', 'yaw-turret.shoulder-servo-mount', 'shoulder-pitch-servo.mount', 'fastened');
arm.mate('shoulder-shaft-fix', 'upper-link.shaft-mount', 'shoulder-pitch-shaft.mount', 'fastened');
arm.mate('elbow-servo-fix', 'upper-link.elbow-servo-mount', 'elbow-pitch-servo.mount', 'fastened');
arm.mate('elbow-shaft-fix', 'forearm-link.shaft-mount', 'elbow-pitch-shaft.mount', 'fastened');
arm.mate('palm-fix', 'forearm-link.palm-mount', 'tool-palm.mount', 'fastened');
arm.mate('grip-servo-fix', 'tool-palm.grip-servo-mount', 'grip-servo.mount', 'fastened');
arm.mate('left-pin-fix', 'tool-palm.left-pin-mount', 'left-hinge-pin.mount', 'fastened');
arm.mate('right-pin-fix', 'tool-palm.right-pin-mount', 'right-hinge-pin.mount', 'fastened');
arm.mate('left-pad-fix', 'left-finger.pad-mount', 'left-finger-pad.mount', 'fastened');
arm.mate('right-pad-fix', 'right-finger.pad-mount', 'right-finger-pad.mount', 'fastened');

arm.mate('base-yaw', 'base-yaw-servo.output', 'base-yaw-output.axis', 'revolute', {
  pose: baseYawDeg,
  limitsDeg: [-55, 55],
});
arm.mate('shoulder-pitch', 'yaw-turret.shoulder-out', 'upper-link.shoulder-in', 'revolute', {
  pose: shoulderPitchDeg,
  limitsDeg: [12, 40],
});
arm.mate('elbow-pitch', 'upper-link.elbow-out', 'forearm-link.elbow-in', 'revolute', {
  pose: elbowPitchDeg,
  limitsDeg: [-58, 12],
});
arm.mate('grip', 'tool-palm.grip-axis', 'grip-driver.axis', 'revolute', {
  pose: gripDeg,
  limitsDeg: [0, 28],
});
arm.mate('left-curl', 'tool-palm.left-hinge', 'left-finger.hinge', 'revolute', {
  limitsDeg: [-14, 0],
});
arm.mate('right-curl', 'tool-palm.right-hinge', 'right-finger.hinge', 'revolute', {
  limitsDeg: [0, 14],
});

arm.coupleMates('left-curl', { source: 'grip', ratio: -0.5 });
arm.coupleMates('right-curl', { source: 'grip', ratio: 0.5 });

arm.transmission('left-finger-gears', {
  kind: 'gear-pair',
  sourceMate: 'grip',
  drivenMates: ['left-curl'],
  actuator: 'grip-servo',
  input: 'grip-driver',
  output: 'left-finger',
  path: ['grip-servo', 'grip-driver', 'left-finger'],
  ratio: -0.5,
});
arm.transmission('right-finger-gears', {
  kind: 'gear-pair',
  sourceMate: 'grip',
  drivenMates: ['right-curl'],
  actuator: 'grip-servo',
  input: 'grip-driver',
  output: 'right-finger',
  path: ['grip-servo', 'grip-driver', 'right-finger'],
  ratio: 0.5,
});

arm.mechanicalJoint('base-yaw-drive', {
  mate: 'base-yaw',
  actuator: 'base-yaw-servo',
  shaft: 'base-yaw-output',
  supports: ['base-plate'],
  output: 'base-yaw-output',
  requiredSupport: {
    kind: 'bearing',
    around: 'base-yaw-output.axis',
    supports: ['base-plate'],
    minBearingLengthMm: 4,
  },
});
arm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder-pitch',
  actuator: 'shoulder-pitch-servo',
  shaft: 'shoulder-pitch-shaft',
  supports: ['yaw-turret'],
  output: 'upper-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'yaw-turret.shoulder-out',
    supports: ['yaw-turret'],
    minBearingLengthMm: 28,
  },
});
arm.mechanicalJoint('elbow-drive', {
  mate: 'elbow-pitch',
  actuator: 'elbow-pitch-servo',
  shaft: 'elbow-pitch-shaft',
  supports: ['upper-link'],
  output: 'forearm-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'upper-link.elbow-out',
    supports: ['upper-link'],
    minBearingLengthMm: 30,
  },
});
arm.mechanicalJoint('grip-drive', {
  mate: 'grip',
  actuator: 'grip-servo',
  shaft: 'grip-driver',
  supports: ['tool-palm'],
  output: 'grip-driver',
  requiredSupport: {
    kind: 'bearing',
    around: 'tool-palm.grip-axis',
    supports: ['tool-palm'],
    minBearingLengthMm: 8,
  },
});
arm.mechanicalJoint('left-finger-drive', {
  mate: 'left-curl',
  actuator: 'grip-servo',
  shaft: 'left-hinge-pin',
  supports: ['tool-palm'],
  output: 'left-finger',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'tool-palm.left-hinge',
    supports: ['tool-palm'],
    minBearingLengthMm: 8,
  },
});
arm.mechanicalJoint('right-finger-drive', {
  mate: 'right-curl',
  actuator: 'grip-servo',
  shaft: 'right-hinge-pin',
  supports: ['tool-palm'],
  output: 'right-finger',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'tool-palm.right-hinge',
    supports: ['tool-palm'],
    minBearingLengthMm: 8,
  },
});

return arm.solvedModel({});
