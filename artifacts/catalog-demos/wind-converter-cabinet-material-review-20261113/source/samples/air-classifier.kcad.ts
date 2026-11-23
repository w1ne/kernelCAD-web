// SPDX-License-Identifier: CC0-1.0
// Air classifier (density separator): the machine that blows the light
// fraction (film, paper, foam) off a stream of heavier material. What makes
// it that machine rather than a conveyor: an infeed belt that throws material
// across an air knife into a tall expansion chamber, a centrifugal blower in
// a round volute housing feeding the air knife, a light-fraction duct that
// rises from the chamber roof into a cyclone with a cone and rotary valve,
// and a heavies chute dropping out under the chamber; access door, ladder
// and a guarded drive motor.
// Generic visualization geometry at about real size (4.6 m long, 4.4 m
// high), millimetres, Z up, infeed toward -Y, cyclone on +Y.

meta({
  name: "air-classifier",
  license: 'CC0-1.0',
  title: "Air classifier",
  description: "Air (density) classifier at about real size: infeed belt throwing material across an air knife into a tall expansion chamber, centrifugal blower in a round volute, light-fraction duct rising into a cyclone with cone and rotary valve, heavies chute, access door, ladder and guarded drive. Material controls: chamber paint, ducting, belt rubber and safety trim. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "air classifier", "density separator", "windshifter", "cyclone", "blower", "sorting", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chamber = param('chamber', '#3f6e8c', { label: 'Chamber and frame (paint)' });
const ducting = param('ducting', '#b9c0c3', { label: 'Ducting and cyclone' });
const belt = param('belt', '#2b2f31', { label: 'Belt rubber' });
const trim = param('trim', '#f0b429', { label: 'Guards, ladder and safety trim' });

presets({
  plant: { chamber: '#3f6e8c', ducting: '#b9c0c3', belt: '#2b2f31', trim: '#f0b429' },
  weathered: { chamber: '#56636a', ducting: '#8e8a80', belt: '#3a3c3b', trim: '#a8893f' },
  stainless: { chamber: '#c6cbcd', ducting: '#dfe3e4', belt: '#2b2f31', trim: '#2f5d9a' },
  highVisibility: { chamber: '#d9692a', ducting: '#c9cfd1', belt: '#2b2f31', trim: '#f2d21b' },
});

const p = assembly("air-classifier");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Infeed belt conveyor rising toward the chamber.
const BW = 900;
add("infeed-frame", profileYZ([[-2300, 700], [-700, 1250], [-700, 1130], [-2300, 580]], BW + 60).color(chamber));
add("infeed-belt", profileYZ([[-2300, 720], [-700, 1270], [-700, 1250], [-2300, 700]], BW).color(belt));
for (const s of [-1, 1]) add(`infeed-skirt-${s}`, profileYZ([[-2250, 740], [-750, 1270], [-750, 1400], [-2250, 870]], 20).translate(s * (BW / 2 - 20), 0, 0).color(trim));
add("tail-drum", cylinder(BW + 80, 80, 12).rotateY(90).translate(-(BW + 80) / 2, -2300, 640).color(ducting));
for (const y of [-2200, -1300]) for (const s of [-1, 1]) add(`infeed-leg-${y}-${s}`, blk(s * 450, y, 0, 70, 70, y < -2000 ? 620 : 930).color(chamber));

// Expansion chamber on legs, heavies chute underneath.
add("chamber", blk(0, 0, 900, 1500, 1400, 2200).color(chamber));
add("chamber-roof", profileYZ([[-700, 3100], [700, 3100], [300, 3450], [-300, 3450]], 1500).color(chamber));
add("access-door", blk(-752, 100, 1600, 8, 600, 1000).color('#2f5876'));
add("door-handle", blk(-760, -150, 2050, 10, 30, 150).color(trim));
add("sight-glass", cylinder(10, 140, 14).rotateY(-90).translate(-752, 100, 2800).color('#9fc3d6'));
for (const [x, y] of [[-700, -650], [700, -650], [-700, 650], [700, 650]]) add(`chamber-leg-${x}-${y}`, blk(x, y, 0, 110, 110, 900).color(chamber));
add("heavies-chute", profileYZ([[-500, 900], [500, 900], [300, 420], [-300, 420]], 1100).color(chamber));
add("heavies-belt", blk(0, 0, 200, 1400, 800, 60).rotateZ(90).color(belt));
add("heavies-frame", blk(0, 0, 0, 1500, 900, 200).rotateZ(90).subtract(blk(0, 0, -10, 1300, 700, 220).rotateZ(90)).color(chamber));

// Air knife header across the belt discharge, fed from the blower.
add("air-knife", blk(0, -760, 1250, 1300, 160, 120).color(ducting));
add("knife-duct", rod([-650, -760, 1310], [-1250, -760, 1310], 120, 12).color(ducting));

// Centrifugal blower: round volute, outlet, motor on a base.
add("blower-base", blk(-1450, -400, 0, 700, 900, 150).color(chamber));
add("blower-volute", cylinder(380, 520, 18).rotateY(90).translate(-1640, -400, 760).color(ducting));
add("blower-outlet", blk(-1450, -760, 1150, 380, 360, 320).color(ducting));
add("blower-riser", rod([-1450, -760, 1460], [-1250, -760, 1310], 120, 12).color(ducting));
add("blower-motor", cylinder(500, 200, 14).rotateY(-90).translate(-1640, -400, 760).color(chamber));
add("motor-guard", blk(-2000, -400, 520, 300, 520, 440).subtract(blk(-1990, -400, 540, 300, 480, 400)).color(trim));

// Light-fraction duct from the roof to a cyclone.
add("lights-duct-up", rod([0, 0, 3400], [0, 0, 3900], 230, 14).color(ducting));
add("lights-duct-elbow", sphere(240).translate(0, 0, 3950).color(ducting));
add("lights-duct-run", rod([0, 0, 3950], [0, 1500, 3950], 230, 14).color(ducting));
add("cyclone", turned([[0, 2050], [180, 2050], [600, 3250], [600, 4250], [0, 4250]]).translate(0, 1900, 0).color(ducting));
add("cyclone-top", cylinder(80, 640, 18).translate(0, 1900, 4250).color(chamber));
add("vortex-outlet", cylinder(500, 220, 12).translate(0, 1900, 4330).color(ducting));
add("rotary-valve", blk(0, 1900, 1650, 420, 420, 400).color(chamber));
add("valve-motor", cylinder(260, 110, 12).rotateY(90).translate(210, 1900, 1850).color(trim));
for (const [x, y] of [[-520, 1380], [520, 1380], [-520, 2420], [520, 2420]]) add(`cyclone-leg-${x}-${y}`, blk(x, y, 0, 100, 100, 3300).color(chamber));
add("cyclone-ring", blk(0, 1900, 3200, 1240, 1240, 60).subtract(blk(0, 1900, 3190, 1100, 1100, 80)).color(chamber));
add("lights-bin", blk(0, 1900, 0, 1000, 1000, 1300).subtract(blk(0, 1900, 80, 900, 900, 1300)).color('#2e6b3a'));

// Caged ladder up the chamber side.
for (const s of [-1, 1]) add(`ladder-rail-${s}`, blk(-820, -400 + s * 220, 0, 50, 50, 3500).color(trim));
for (let z = 300; z < 3400; z += 350) add(`ladder-rung-${z}`, rod([-820, -620, z], [-820, -180, z], 15, 6).color(trim));
add("roof-rail", blk(0, -720, 3500, 1500, 40, 40).color(trim));

return p.model();
