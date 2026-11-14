// SPDX-License-Identifier: CC0-1.0
// Belt conveyor tail section: the loading end of a troughed belt conveyor,
// where material arrives and the belt is tensioned. What makes it that
// section rather than a long slab: a wing tail pulley (so spilled material
// is flung clear instead of crushed into the belt) mounted on screw
// take-ups, a loading chute with rubber-lined skirtboards over an impact
// bed of close-pitched rolls, a V-plough cleaning the return run before
// the pulley, troughing idlers marching away toward the head, and a
// guard mesh over the nip point.
// Generic visualization geometry at about real size (6 m long, 1.6 m wide,
// 2.6 m high at the chute), millimetres, Z up, belt runs toward +Y.

meta({
  name: "belt-conveyor-tail",
  license: 'CC0-1.0',
  title: "Belt conveyor tail section",
  description: "Troughed belt conveyor tail section at about real size: wing tail pulley on screw take-ups, loading chute with rubber skirtboards over an impact bed, V-plough on the return run, troughing idlers, nip-point guard mesh and support legs. Material controls: frame paint, belt rubber, idler rolls and chute liner, safety guards; mixed recyclables, glass cullet or paper falling from the chute. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "belt conveyor", "conveyor tail", "tail pulley", "wing pulley", "take-up", "loading chute", "skirtboard", "impact bed", "troughed belt", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3d7a4a', { label: 'Frame and chute (paint)' });
const belt = param('belt', '#2b2f31', { label: 'Belt and skirt rubber' });
const rolls = param('rolls', '#a9b0b3', { label: 'Idler rolls and pulley' });
const guard = param('guard', '#f0b429', { label: 'Guards and safety trim' });
const load = param('load', 'mixed', { choices: ['mixed', 'glass', 'paper', 'empty'], label: 'Material on belt' });

presets({
  plant: { frame: '#3d7a4a', belt: '#2b2f31', rolls: '#a9b0b3', guard: '#f0b429' },
  weathered: { frame: '#5b6553', belt: '#3a3836', rolls: '#86857e', guard: '#a8893f' },
  stainless: { frame: '#c6cbcd', belt: '#30363a', rolls: '#e0e4e5', guard: '#2f5d9a' },
  highVisibility: { frame: '#2a6fb5', belt: '#1f2224', rolls: '#c9ced1', guard: '#f2d21b' },
});

const p = assembly("belt-conveyor-tail");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// (x, z) cross-section extruded along Y from y0 to y1.
const alongY = (pts, y0: number, y1: number) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const ZP = 900, RP = 320, ZB = ZP + RP; // tail pulley axis and radius, belt top height
const FX = 620, Y1 = 6000; // stringer x, head-ward end of the shown section
const T = 35; // trough angle
const c = Math.cos((T * Math.PI) / 180), sn = Math.sin((T * Math.PI) / 180);
const half = 180, wing = 340;

// Wing tail pulley: hub and shaft with radial wings, so it reads as self-cleaning.
add("pulley-hub", alongX(-500, 1000, 110, 0, ZP, 16).color(rolls));
for (let k = 0; k < 8; k++) add(`pulley-wing-${k}`, box(1000, 30, RP - 110, true).translate(0, 0, (RP + 110) / 2).rotateX(k * 45).translate(0, 0, ZP).color(rolls));
for (const s of [-1, 1]) add(`pulley-disc-${s}`, alongX(s > 0 ? 470 : -500, 30, RP, 0, ZP, 20).color(rolls));
add("pulley-shaft", alongX(-850, 1700, 55, 0, ZP).color(rolls));

// Screw take-ups: slide frames, bearing blocks and tension screws on each side.
for (const s of [-1, 1]) {
  add(`takeup-frame-${s}`, blk(s * 760, 200, ZP - 120, 120, 1100, 60).color(frame));
  add(`takeup-frame-top-${s}`, blk(s * 760, 200, ZP + 60, 120, 1100, 60).color(frame));
  add(`takeup-bearing-${s}`, blk(s * 760, 0, ZP - 60, 170, 260, 120).color('#5a6266'));
  add(`takeup-screw-${s}`, cylinder(900, 22, 8).rotateX(-90).translate(s * 760, -650, ZP).color(rolls));
  add(`takeup-nut-${s}`, blk(s * 760, -660, ZP - 50, 130, 60, 100).color(guard));
  add(`tail-leg-${s}`, blk(s * 760, 200, 0, 140, 140, ZP - 120).color(frame));
}

// Belt: wraps the tail pulley flat, troughs out toward the head, returns below.
const trough = (dz: number, th: number) => [
  [-half - wing * c, ZB + dz + wing * sn], [-half, ZB + dz], [half, ZB + dz], [half + wing * c, ZB + dz + wing * sn],
  [half + wing * c, ZB + dz + wing * sn + th], [half, ZB + dz + th], [-half, ZB + dz + th], [-half - wing * c, ZB + dz + wing * sn + th],
];
add("belt-wrap", alongX(-480, 960, RP + 15, 0, ZP, 24).subtract(alongX(-500, 1000, RP, 0, ZP, 24)).subtract(blk(0, 300, ZP - RP - 50, 1100, 600, 2 * RP + 100)).color(belt));
add("belt-transition", blk(0, 450, ZB, 2 * half + 2 * wing * c - 60, 900, 18).color(belt));
add("belt-trough", alongY(trough(0, 18), 900, Y1).color(belt));
add("belt-return", blk(0, Y1 / 2, ZP - RP - 18, 900, Y1, 18).color(belt));

// V-plough on the return run, just ahead of the pulley.
for (const s of [-1, 1]) add(`plough-blade-${s}`, box(560, 30, 120, true).rotateZ(s * 30).translate(s * 240, 650, ZP - RP + 60).color(belt));
add("plough-frame", blk(0, 700, ZP - RP + 120, 2 * FX, 60, 60).color(frame));

// Impact bed: close-pitched heavy rolls under the loading zone.
for (const y of [1300, 1550, 1800, 2050, 2300]) {
  add(`impact-centre-${y}`, alongX(-half, 2 * half, 70, y, ZB - 72, 10).color(rolls));
  for (const s of [-1, 1]) add(`impact-wing-${y}-${s}`, cylinder(wing, 70, 10).rotateY(s * (90 - T)).translate(s * half, y, ZB - 72).color(rolls));
}
add("impact-cradle", blk(0, 1800, ZB - 260, 2 * FX, 1200, 60).color(frame));

// Troughing idlers marching toward the head, and return idlers below.
for (const y of [3300, 4500, 5700]) {
  add(`idler-centre-${y}`, alongX(-half, 2 * half, 55, y, ZB - 57).color(rolls));
  for (const s of [-1, 1]) add(`idler-wing-${y}-${s}`, cylinder(wing, 55, 10).rotateY(s * (90 - T)).translate(s * half, y, ZB - 57).color(rolls));
  add(`idler-frame-${y}`, blk(0, y, ZB - 180, 2 * FX, 70, 50).color(frame));
}
for (const y of [2600, 5000]) add(`return-idler-${y}`, alongX(-500, 1000, 55, y, ZP - RP - 75).color(rolls));

// Stringers and legs.
for (const s of [-1, 1]) {
  add(`stringer-${s}`, blk(s * FX, (800 + Y1) / 2, ZB - 300, 100, Y1 - 800, 180).color(frame));
  for (const y of [1800, 4000, 5800]) add(`leg-${s}-${y}`, blk(s * FX, y, 0, 110, 110, ZB - 300).color(frame));
}

// Loading chute: a sloped side-profile hopper over the impact bed, with skirtboards.
add("loading-chute", profileYZ([[1100, ZB + 300], [2500, ZB + 300], [2700, ZB + 1300], [2300, ZB + 1450], [900, ZB + 1450], [800, ZB + 700]], 900).subtract(blk(0, 1700, ZB + 750, 780, 1250, 800)).color(frame));
add("chute-lip", blk(0, 1700, ZB + 1450, 1000, 1500, 60).subtract(blk(0, 1700, ZB + 1400, 780, 1250, 200)).color(guard));
for (const s of [-1, 1]) {
  add(`skirtboard-${s}`, blk(s * 380, 2300, ZB + 140, 20, 2600, 260).color(frame));
  add(`skirt-rubber-${s}`, blk(s * 380, 2300, ZB + 60, 30, 2600, 90).color(belt));
}

// Material falling from the chute and riding away on the belt.
if (load.value !== 'empty') {
  const loadColor = load.value === 'glass' ? '#4f8a6a' : load.value === 'paper' ? '#d9d2bf' : '#8a6f55';
  add("load", alongY([[-360, ZB + 110], [360, ZB + 110], [180, ZB + 270], [-130, ZB + 290]], 1700, Y1 - 200).color(loadColor));
  for (let k = 0; k < 5; k++) add(`lump-${k}`, box(160, 200, 110, true).rotateZ(30 * k).rotateX(10 * k).translate(-160 + (k % 3) * 160, 3000 + k * 600, ZB + 260).color(k % 2 ? '#5c8fc4' : '#c8a23a'));
}

// Nip-point guard: mesh panel frames across the tail end.
add("guard-frame", blk(0, -380, ZP - 450, 1500, 40, 900).subtract(blk(0, -380, ZP - 380, 1360, 80, 760)).color(guard));
for (let k = 0; k < 7; k++) add(`guard-bar-${k}`, blk(-600 + k * 200, -380, ZP - 380, 14, 20, 760).color(guard));
add("guard-sign", blk(0, -405, ZP + 250, 360, 10, 160).color('#c8202a'));

return p.model();
