// SPDX-License-Identifier: CC0-1.0
// Dust extraction hood: the enclosure over a dusty point on a sorting-line
// conveyor (a screen discharge, a glass or shredded-waste transfer) where a
// fan draws the dust away. What makes it that hood rather than a box on a
// table: a troughed belt conveyor running through it on three-roll idlers and
// legs, a sheet-steel casing straddling the belt with rubber strip curtains at
// entry and exit, a pyramid hood tapering up to a round take-off duct with a
// butterfly damper and lever, the duct elbowing away toward the dust filter
// on a stanchion, and a hinged inspection door on the front showing the load
// inside.
// Generic visualization geometry at about real size (5.8 m long, 3.3 m
// tall), millimetres, Z up, inspection door on -Y.

meta({
  name: "dust-extraction-hood",
  license: 'CC0-1.0',
  title: "Dust extraction hood",
  description: "Conveyor dust extraction hood at about real size: troughed belt conveyor with load on three-roll idlers and legs, sheet-steel casing over the belt with rubber strip curtains at both ends, pyramid hood to a round take-off duct with butterfly damper and lever, duct elbowing away on a stanchion, hinged inspection door and dust warning sign. Door open or closed. Material controls: hood, ductwork, conveyor frame and belt and curtains. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "dust extraction", "hood", "conveyor", "ductwork", "damper", "strip curtain", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hood = param('hood', '#5d7f8c', { label: 'Hood and casing (paint)' });
const duct = param('duct', '#a8b4b6', { label: 'Ductwork (galvanised)' });
const conveyor = param('conveyor', '#e0a526', { label: 'Conveyor frame (paint)' });
const belt = param('belt', '#24272a', { label: 'Belt and curtains (rubber)' });
const doorState = param('doorState', 'open', { choices: ['open', 'closed'], label: 'Inspection door' });

presets({
  plant: { hood: '#5d7f8c', duct: '#a8b4b6', conveyor: '#e0a526', belt: '#24272a' },
  weathered: { hood: '#6e6a62', duct: '#8e9294', conveyor: '#8a7a52', belt: '#2c2a28' },
  stainless: { hood: '#c4c9cb', duct: '#d0d4d6', conveyor: '#8a9196', belt: '#2a2c2e' },
  highVisibility: { hood: '#2f6b8f', duct: '#c9ccce', conveyor: '#f0c419', belt: '#1c1d1e' },
});

const p = assembly("dust-extraction-hood");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const plane = (z: number) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const tag = (x: number) => (x < 0 ? `m${-x}` : `p${x}`);

// Troughed belt conveyor along X.
const L = 5000, BZ = 900;
add("belt-centre", blk(0, 0, BZ - 12, L, 420, 12).color(belt));
for (const s of [-1, 1]) add(`belt-wing-${s < 0 ? 'f' : 'b'}`, box(L, 320, 12, true).rotateX(s * 30).translate(0, s * 345, BZ + 74).color(belt));
add("belt-load", profileYZ([[-380, BZ + 40], [-220, BZ + 110], [-60, BZ + 150], [120, BZ + 140], [300, BZ + 90], [400, BZ + 60], [0, BZ - 2]], L - 300).color('#9a8f7a'));
add("return-belt", blk(0, 0, 460, L, 760, 10).color(belt));
for (const s of [-1, 1]) {
  add(`stringer-${s < 0 ? 'f' : 'b'}`, blk(0, s * 560, 700, L, 70, 150).color(conveyor));
  add(`pulley-${s < 0 ? 'tail' : 'head'}`, rod([s * L / 2, -480, 720], [s * L / 2, 480, 720], 190, 14).color(conveyor));
  add(`pulley-bearing-${s < 0 ? 'tail' : 'head'}`, blk(s * L / 2, -540, 660, 220, 60, 120).color('#3a3d40'));
}
for (const x of [-2100, -1500, 1500, 2100]) {
  add(`idler-frame-${tag(x)}`, blk(x, 0, 760, 80, 1080, 40).color(conveyor));
  add(`idler-centre-${tag(x)}`, rod([x, -210, BZ - 70], [x, 210, BZ - 70], 58).color('#5d6366'));
  for (const s of [-1, 1]) add(`idler-wing-${tag(x)}-${s < 0 ? 'f' : 'b'}`, rod([x, s * 215, BZ - 66], [x, s * 480, BZ + 88], 58).color('#5d6366'));
}
for (const x of [-2300, -900, 900, 2300]) {
  for (const s of [-1, 1]) add(`leg-${tag(x)}-${s < 0 ? 'f' : 'b'}`, blk(x, s * 560, 0, 90, 90, 700).color(conveyor));
  add(`leg-tie-${tag(x)}`, blk(x, 0, 300, 70, 1120, 70).color(conveyor));
  for (const s of [-1, 1]) add(`leg-foot-${tag(x)}-${s < 0 ? 'f' : 'b'}`, blk(x, s * 560, 0, 220, 220, 15).color(conveyor));
}

// Casing straddling the belt: top plate and two side walls, open at the ends.
const CL = 2200, CW = 1300, CZ0 = 800, CZ1 = 1500;
const doorX0 = -700, DW = 700, DH = 420, DZ = 960;
let casing = blk(0, 0, CZ0, CL, CW, CZ1 - CZ0).subtract(blk(0, 0, CZ0 - 20, CL + 100, CW - 24, CZ1 - CZ0 - 10));
if (doorState.value === 'open') casing = casing.subtract(blk(doorX0 + DW / 2, -CW / 2, DZ, DW, 60, DH));
add("casing", casing.color(hood));
for (const x of [-CL / 2, CL / 2]) add(`casing-flange-${tag(x)}`, blk(x, 0, CZ0, 60, CW + 40, CZ1 - CZ0 + 20).subtract(blk(x, 0, CZ0 - 10, 100, CW - 60, CZ1 - CZ0 - 30)).color(hood));
// Rubber strip curtains at the entry and exit.
for (const x of [-CL / 2, CL / 2]) {
  for (let k = 0; k < 11; k++) add(`curtain-${tag(x)}-${k}`, blk(x, -575 + k * 115, BZ + 180, 10, 105, CZ1 - BZ - 190).color(belt));
}
// Pyramid hood up to the round take-off.
const HZ = 2150;
add("hood-pyramid", rect(CL, CW).loft([rect(640, 640)], { planes: [plane(CZ1), plane(HZ)], ruled: true }).color(hood));
add("hood-collar", blk(0, 0, HZ, 700, 700, 60).color(hood));
for (const s of [-1, 1]) add(`hood-stiffener-${s < 0 ? 'l' : 'r'}`, box(60, CW + 20, 60, true).translate(s * 820, 0, CZ1 + 150).color(hood));

// Round duct, butterfly damper and elbow away to the filter.
const DR = 280, TZ = 3050, EX = 2900;
add("duct-riser", cylinder(TZ - HZ - 60, DR, 18).translate(0, 0, HZ + 60).color(duct));
for (const z of [2330, 2480]) add(`damper-flange-${z}`, cylinder(30, DR + 40, 18).translate(0, 0, z).color(duct));
add("damper-body", cylinder(120, DR + 15, 18).translate(0, 0, 2360).color('#3a5c8a'));
add("damper-quadrant", blk(-40, -DR - 70, 2380, 160, 60, 80).color('#3a5c8a'));
add("damper-lever", box(40, 300, 30, true).rotateZ(25).translate(-110, -DR - 220, 2430).color('#c8322a'));
add("duct-elbow", sphere(DR + 10).translate(0, 0, TZ).color(duct));
add("duct-run", rod([0, 0, TZ], [EX, 0, TZ], DR, 18).color(duct));
for (const x of [900, 1900, EX]) add(`duct-flange-${tag(x)}`, cylinder(30, DR + 40, 18).rotateY(90).translate(x - 15, 0, TZ).color(duct));
add("duct-stanchion", blk(2600, 0, 0, 120, 120, TZ - DR - 20).color(conveyor));
add("duct-cradle", blk(2600, 0, TZ - DR - 60, 200, 660, 60).color(conveyor));
add("duct-arrow", extrudePolygon([[0, -50], [240, -50], [240, -110], [380, 0], [240, 110], [240, 50], [0, 50]], 10).rotateX(90).translate(1200, -DR - 10, TZ).color('#f0c419'));

// Inspection door on the front, and a dust hazard sign.
const doorPanel = blk(DW / 2, 0, 0, DW, 14, DH);
const handle = blk(DW - 80, -20, DH / 2 - 60, 40, 30, 120);
if (doorState.value === 'open') {
  const swing = (s: Shape) => s.rotateZ(-100).translate(doorX0, -CW / 2 - 8, DZ);
  add("inspection-door", swing(doorPanel).color(hood));
  add("door-handle", swing(handle).color('#1c1d1e'));
} else {
  add("inspection-door", doorPanel.translate(doorX0, -CW / 2 - 8, DZ).color(hood));
  add("door-handle", handle.translate(doorX0, -CW / 2 - 8, DZ).color('#1c1d1e'));
}
for (const z of [DZ + 60, DZ + DH - 100]) add(`door-hinge-${z}`, cylinder(60, 18, 8).translate(doorX0, -CW / 2 - 14, z).color('#1c1d1e'));
add("dust-sign", blk(450, -CW / 2 - 6, 1050, 420, 8, 300).color('#f0c419'));
add("dust-sign-mark", extrudePolygon([[-110, 0], [110, 0], [0, 180]], 6).rotateX(90).translate(450, -CW / 2 - 10, 1110).color('#1c1d1e'));

return p.model();
