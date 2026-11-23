// SPDX-License-Identifier: CC0-1.0
// Belt conveyor head section: the discharge end of a troughed belt
// conveyor, where the drive lives. What makes it that section rather than a
// long slab: a troughed belt on three-roll idlers carrying a ridge of
// material up to a head hood that wraps the head pulley and drops into a
// discharge chute, a shaft-mounted gearbox and motor hanging off the pulley
// shaft with a torque arm and a guarded drive, return idlers below, and a
// walkway with handrail and pull-cord stop along the side.
// Generic visualization geometry at about real size (6.5 m long, 3.3 m
// wide with walkway, 2.6 m high), millimetres, Z up, discharge toward -Y.

meta({
  name: "belt-conveyor-head",
  license: 'CC0-1.0',
  title: "Belt conveyor head section",
  description: "Troughed belt conveyor head section at about real size: troughed belt on three-roll idlers carrying material, head hood over the head pulley dropping into a discharge chute, shaft-mounted gearbox and motor with torque arm and guard, return idlers, walkway with handrail and pull-cord stop. Material controls: frame and hood paint, belt rubber, idler rolls and safety trim; mixed recyclables, glass cullet or paper on the belt. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "belt conveyor", "conveyor head", "head pulley", "troughed belt", "idler", "drive", "discharge chute", "walkway", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2100,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3d7a4a', { label: 'Frame and head hood (paint)' });
const belt = param('belt', '#2b2f31', { label: 'Belt rubber' });
const rolls = param('rolls', '#a9b0b3', { label: 'Idler rolls and pulley' });
const trim = param('trim', '#f0b429', { label: 'Guards, handrail and safety trim' });
const load = param('load', 'mixed', { choices: ['mixed', 'glass', 'paper', 'empty'], label: 'Material on belt' });

presets({
  plant: { frame: '#3d7a4a', belt: '#2b2f31', rolls: '#a9b0b3', trim: '#f0b429' },
  weathered: { frame: '#5b6553', belt: '#3a3836', rolls: '#86857e', trim: '#a8893f' },
  stainless: { frame: '#c6cbcd', belt: '#30363a', rolls: '#e0e4e5', trim: '#2f5d9a' },
  highVisibility: { frame: '#2a6fb5', belt: '#1f2224', rolls: '#c9ced1', trim: '#f2d21b' },
});

const p = assembly("belt-conveyor-head");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// (x, z) cross-section extruded along Y from y0 to y1.
const alongY = (pts, y0: number, y1: number) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const ZP = 1500, RP = 420, ZB = ZP + RP; // head pulley axis and radius, belt centre height
const FX = 720, Y1 = 6500; // stringer x, tail end of the shown section
const T = 35; // trough angle

// Head pulley, shaft and pillow blocks (inside the hood, shaft ends show).
add("head-pulley", alongX(-600, 1200, RP, 0, ZP, 24).color(rolls));
add("pulley-shaft", alongX(-1150, 2300, 75, 0, ZP).color(rolls));
for (const s of [-1, 1]) add(`pillow-block-${s}`, blk(s * 930, 0, ZP - 150, 200, 320, 220).color('#5a6266'));
for (const s of [-1, 1]) add(`bearing-bracket-${s}`, blk(s * 930, 0, 0, 160, 300, ZP - 150).color(frame));

// Troughed belt: flat over the pulley, troughing out toward the tail.
const c = Math.cos((T * Math.PI) / 180), sn = Math.sin((T * Math.PI) / 180);
const half = 200, wing = 380;
const trough = (dz: number, th: number) => [
  [-half - wing * c, ZB + dz + wing * sn], [-half, ZB + dz], [half, ZB + dz], [half + wing * c, ZB + dz + wing * sn],
  [half + wing * c, ZB + dz + wing * sn + th], [half, ZB + dz + th], [-half, ZB + dz + th], [-half - wing * c, ZB + dz + wing * sn + th],
];
add("belt-trough", alongY(trough(0, 20), 900, Y1).color(belt));
add("belt-transition", blk(0, 450, ZB, 2 * half + 2 * wing * c - 60, 900, 20).color(belt));
add("belt-return", blk(0, Y1 / 2, ZP - RP - 20, 1000, Y1, 20).color(belt));

// Ridge of material riding on the belt.
if (load.value !== 'empty') {
  const loadColor = load.value === 'glass' ? '#4f8a6a' : load.value === 'paper' ? '#d9d2bf' : '#8a6f55';
  add("load", alongY([[-420, ZB + 120], [420, ZB + 120], [200, ZB + 300], [-150, ZB + 330]], 600, Y1 - 300).color(loadColor));
  for (let k = 0; k < 6; k++) add(`lump-${k}`, box(180, 220, 120, true).rotateZ(25 * k).translate(-200 + (k % 3) * 200, 1200 + k * 800, ZB + 300).color(k % 2 ? '#5c8fc4' : '#c8a23a'));
}

// Three-roll troughing idlers and return idlers.
for (const y of [1500, 2700, 3900, 5100, 6300]) {
  add(`idler-centre-${y}`, alongX(-half, 2 * half, 60, y, ZB - 62).color(rolls));
  for (const s of [-1, 1]) add(`idler-wing-${y}-${s}`, cylinder(wing, 60, 10).rotateY(s * (90 - T)).translate(s * half, y, ZB - 62).color(rolls));
  add(`idler-frame-${y}`, blk(0, y, ZB - 200, 2 * FX, 80, 60).color(frame));
  for (const s of [-1, 1]) add(`idler-post-${y}-${s}`, blk(s * (half + wing * c + 20), y, ZB - 140, 50, 80, wing * sn + 60).color(frame));
}
for (const y of [2400, 4800]) add(`return-idler-${y}`, alongX(-560, 1120, 60, y, ZP - RP - 80).color(rolls));

// Stringers and legs.
for (const s of [-1, 1]) {
  add(`stringer-${s}`, blk(s * FX, (900 + Y1) / 2, ZB - 300, 100, Y1 - 900, 200).color(frame));
  for (const y of [1200, 3900, 6300]) add(`leg-${s}-${y}`, blk(s * FX, y, 0, 120, 120, ZB - 300).color(frame));
}

// Head hood wrapping the pulley, dropping into the discharge chute.
add("head-hood", profileYZ([[700, ZP - 250], [700, ZP + 820], [100, ZP + 1050], [-500, ZP + 980], [-950, ZP + 650], [-1050, ZP - 100], [-850, 600], [-300, 600], [-180, ZP - 250]], 1500).color(frame));
add("hood-door", blk(-756, -380, ZP + 50, 12, 600, 600).color(trim));
add("door-handle", blk(-768, -600, ZP + 300, 20, 40, 160).color('#2b2f31'));
add("hood-skirt", blk(0, 780, ZB + 40, 1500, 160, 360).color(frame));
add("chute-flange", blk(0, -575, 500, 700, 700, 100).color(frame));
for (const s of [-1, 1]) add(`chute-leg-${s}`, blk(s * 420, -575, 0, 100, 100, 500).color(frame));

// Shaft-mounted gearbox and motor on -X, with torque arm and guard.
add("gearbox", blk(-1350, 0, ZP - 380, 420, 600, 760).color('#3d4448'));
add("motor", cylinder(800, 220, 14).rotateX(-90).translate(-1350, 330, ZP - 200).color(frame));
add("motor-fan-cowl", cylinder(120, 200, 14).rotateX(-90).translate(-1350, 1130, ZP - 200).color('#2b2f31'));
add("torque-arm", blk(-1350, 0, 250, 80, 80, ZP - 630).color(rolls));
add("torque-arm-base", blk(-1350, 0, 0, 300, 300, 250).color(frame));
add("drive-guard", blk(-1080, 0, ZP - 260, 140, 520, 520).color(trim));

// Walkway with grating, toe board, handrail and pull-cord stop on -X.
const WX = -FX - 900;
add("walkway", blk(WX, (1000 + Y1) / 2, ZB - 700, 900, Y1 - 1000, 50).color('#5a6266'));
add("toe-board", blk(WX - 430, (1000 + Y1) / 2, ZB - 650, 20, Y1 - 1000, 120).color(trim));
for (const y of [1100, 2900, 4700, 6400]) {
  add(`walkway-leg-${y}`, blk(WX - 400, y, 0, 80, 80, ZB - 700).color(frame));
  add(`rail-post-${y}`, blk(WX - 430, y, ZB - 650, 50, 50, 1100).color(trim));
}
add("handrail", blk(WX - 430, (1100 + Y1) / 2, ZB + 400, 50, Y1 - 1050, 50).color(trim));
add("midrail", blk(WX - 430, (1100 + Y1) / 2, ZB - 100, 40, Y1 - 1050, 40).color(trim));
add("pull-cord", blk(WX - 395, (1200 + Y1) / 2, ZB + 200, 12, Y1 - 1200, 12).color('#c8202a'));
add("pull-cord-switch", blk(WX - 360, 1250, ZB + 80, 120, 140, 220).color('#c8202a'));

return p.model();
