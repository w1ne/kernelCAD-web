// SPDX-License-Identifier: CC0-1.0
// Inclined belt conveyor: the pit-to-incline conveyor that lifts loose
// recyclables from the tipping floor up to the sort line. What makes it
// that machine rather than a ramp: a flat loading section with a steep
// receiving hopper, a knee where the bed bends up to about 25 degrees, a
// cleated belt running between tall bolted sidewalls so nothing rolls
// back, trestle legs that grow taller toward the head, a hooded head
// drive with motor and gearbox, and a discharge chute dropping off the top.
// Generic visualization geometry at about real size (10 m long, 1.9 m
// wide, 4.4 m high at the head), millimetres, Z up, belt rises toward +Y.

meta({
  name: "inclined-belt-conveyor",
  license: 'CC0-1.0',
  title: "Inclined belt conveyor",
  description: "Pit-to-incline cleated belt conveyor at about real size: flat loading section with receiving hopper, knee up to about 25 degrees, cleated belt between tall bolted sidewalls, trestle legs rising toward the head, hooded head drive with motor and gearbox, discharge chute and access ladder. Material controls: frame and sidewall paint, belt rubber, drive and roll steel, safety trim; mixed recyclables, cardboard or containers on the belt. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "belt conveyor", "inclined conveyor", "incline", "cleated belt", "pit conveyor", "hopper", "head drive", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6a9a', { label: 'Frame, sidewalls and hood (paint)' });
const belt = param('belt', '#2b2f31', { label: 'Belt and cleat rubber' });
const steel = param('steel', '#a9b0b3', { label: 'Drive, shafts and rolls (steel)' });
const trim = param('trim', '#f0b429', { label: 'Guards, ladder and safety trim' });
const angle = param('angle', '25', { choices: ['18', '25', '30'], label: 'Incline angle (degrees)' });
const load = param('load', 'mixed', { choices: ['mixed', 'cardboard', 'containers', 'empty'], label: 'Material on belt' });

presets({
  plant: { frame: '#2f6a9a', belt: '#2b2f31', steel: '#a9b0b3', trim: '#f0b429' },
  weathered: { frame: '#56646c', belt: '#3a3836', steel: '#86857e', trim: '#a8893f' },
  stainless: { frame: '#c6cbcd', belt: '#30363a', steel: '#e0e4e5', trim: '#2f5d9a' },
  highVisibility: { frame: '#e0702a', belt: '#1f2224', steel: '#c9ced1', trim: '#f2d21b' },
});

const p = assembly("inclined-belt-conveyor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const A = Number(angle.value), rad = (A * Math.PI) / 180;
const KY = 2600, ZB = 700, L = Math.round(7000 * Math.cos((25 * Math.PI) / 180) / Math.cos(rad)); // knee y, belt height, incline length
const W = 1200, SW = 650; // belt width, sidewall height
const HY = KY + L * Math.cos(rad), HZ = ZB + L * Math.sin(rad); // head pulley position
// Put a part built along +Y from the knee onto the incline.
const incline = (s: Shape) => s.translate(0, -KY, -ZB).rotateX(A).translate(0, KY, ZB);
// Belt surface height at a given y.
const beltZ = (y: number) => (y <= KY ? ZB : ZB + (y - KY) * Math.tan(rad));

// Belt and cleats: flat loading run, then the incline.
add("belt-flat", blk(0, KY / 2, ZB - 20, W, KY, 20).color(belt));
add("belt-incline", incline(blk(0, KY + L / 2, ZB - 20, W, L, 20)).color(belt));
for (let k = 0; k < 4; k++) add(`cleat-flat-${k}`, blk(0, 400 + k * 600, ZB, W - 80, 30, 90).color(belt));
for (let k = 0; k < 12; k++) add(`cleat-${k}`, incline(blk(0, KY + 300 + k * (L - 600) / 11, ZB, W - 80, 30, 90)).color(belt));

// Bed pan and bolted sidewalls on both runs.
for (const s of [-1, 1]) {
  add(`sidewall-flat-${s}`, blk(s * (W / 2 + 40), KY / 2, ZB - 250, 30, KY, SW + 250).color(frame));
  add(`sidewall-incline-${s}`, incline(blk(s * (W / 2 + 40), KY + L / 2, ZB - 250, 30, L, SW + 250)).color(frame));
  add(`sidewall-cap-${s}`, incline(blk(s * (W / 2 + 40), KY + L / 2, ZB + SW, 90, L, 40)).color(trim));
  for (let k = 0; k < 8; k++) add(`stiffener-${s}-${k}`, incline(blk(s * (W / 2 + 75), KY + 400 + k * (L - 800) / 7, ZB - 250, 40, 60, SW + 250)).color(frame));
}
add("bed-pan-flat", blk(0, KY / 2, ZB - 260, W + 110, KY, 30).color(frame));
add("bed-pan-incline", incline(blk(0, KY + L / 2, ZB - 260, W + 110, L, 30)).color(frame));

// Receiving hopper over the loading run: flared walls in side profile.
add("hopper", profileYZ([[100, ZB + 200], [KY - 300, ZB + 200], [KY + 200, ZB + 1500], [-300, ZB + 1500]], W + 900)
  .subtract(profileYZ([[180, ZB + 150], [KY - 380, ZB + 150], [KY + 100, ZB + 1600], [-220, ZB + 1600]], W + 700)).color(frame));
add("hopper-rim", blk(0, KY / 2 - 50, ZB + 1500, W + 1000, KY + 600, 70).subtract(blk(0, KY / 2 - 50, ZB + 1450, W + 700, KY + 300, 200)).color(trim));

// Tail pulley at the loading end.
add("tail-pulley", alongX(-W / 2, W, 220, 0, ZB - 230, 16).color(steel));
add("tail-shaft", alongX(-W / 2 - 200, W + 400, 45, 0, ZB - 230).color(steel));
for (const s of [-1, 1]) add(`tail-takeup-${s}`, blk(s * (W / 2 + 160), 0, ZB - 330, 150, 400, 200).color('#5a6266'));

// Head: hood over the head pulley, drive, discharge chute.
add("head-pulley", alongX(-W / 2, W, 240, HY, HZ - 240, 16).color(steel));
add("head-hood", profileYZ([[HY - 700, HZ - 500], [HY - 700, HZ + 400], [HY + 100, HZ + 600], [HY + 600, HZ + 300], [HY + 600, HZ - 1000], [HY + 100, HZ - 1000]], W + 260).color(frame));
add("discharge-chute", profileYZ([[HY + 100, HZ - 1000], [HY + 600, HZ - 1000], [HY + 900, HZ - 1700], [HY + 500, HZ - 1700]], W).color(frame));
add("gearbox", blk(W / 2 + 330, HY, HZ - 520, 340, 500, 560).color('#3d4448'));
add("motor", cylinder(700, 180, 14).rotateX(90).translate(W / 2 + 330, HY - 250, HZ - 300).color(frame));
add("motor-fan-cowl", cylinder(100, 165, 14).rotateX(90).translate(W / 2 + 330, HY - 950, HZ - 300).color('#2b2f31'));
add("drive-guard", blk(W / 2 + 140, HY, HZ - 450, 80, 420, 420).color(trim));

// Trestle legs, taller toward the head.
for (const y of [600, 2200]) for (const s of [-1, 1]) add(`pit-leg-${s}-${y}`, blk(s * (W / 2 + 120), y, 0, 120, 120, ZB - 260).color(frame));
for (const [i, t] of [0.3, 0.62, 0.95].entries()) {
  const y = KY + L * t * Math.cos(rad), z = beltZ(y) - 300;
  for (const s of [-1, 1]) add(`trestle-leg-${i}-${s}`, blk(s * (W / 2 + 120), y, 0, 140, 140, z).color(frame));
  add(`trestle-tie-${i}`, blk(0, y, z * 0.45, W + 380, 100, 100).color(frame));
  for (const s of [-1, 1]) add(`trestle-brace-${i}-${s}`, box(80, 80, z * 0.75, true).rotateY(s * 18).translate(s * (W / 4 + 60), y, z * 0.5).color(frame));
}

// Access ladder up the side to the head platform.
const LX = -W / 2 - 600;
add("head-platform", blk(LX + 150, HY - 200, HZ - 900, 700, 1000, 60).color('#5a6266'));
for (const s of [-1, 1]) add(`ladder-rail-${s}`, blk(LX + s * 220, HY - 650, 0, 50, 50, HZ - 840).color(trim));
for (let k = 0; k < Math.floor((HZ - 900) / 300); k++) add(`ladder-rung-${k}`, blk(LX, HY - 650, 300 + k * 300, 440, 30, 30).color(trim));
add("platform-rail", blk(LX - 180, HY - 200, HZ - 840, 40, 1000, 1000).subtract(blk(LX - 180, HY - 200, HZ - 800, 80, 900, 880)).color(trim));

// Material between the cleats.
if (load.value !== 'empty') {
  const col = load.value === 'cardboard' ? ['#b08a5a', '#c9a777'] : load.value === 'containers' ? ['#5c8fc4', '#d9d9d2'] : ['#8a6f55', '#c8a23a'];
  for (let k = 0; k < 10; k++) {
    const yy = KY + 500 + k * (L - 1200) / 9;
    add(`lump-${k}`, incline(box(320 + (k % 3) * 80, 220, 140, true).rotateZ(20 * k).translate(-250 + (k % 4) * 170, yy, ZB + 70)).color(col[k % 2]));
  }
  for (let k = 0; k < 3; k++) add(`pit-lump-${k}`, box(360, 260, 160, true).rotateZ(35 * k).translate(-200 + k * 200, 900 + k * 500, ZB + 80).color(col[k % 2]));
}

return p.model();
