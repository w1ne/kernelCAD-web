// SPDX-License-Identifier: CC0-1.0
// Infeed hopper: the big receiving bin a wheel loader tips into at the
// start of a sort line. What makes it that machine rather than a box: a
// wide flared hopper with an open mouth and a raised loader-side wall
// lined with bolted wear plates, a steel-pan apron conveyor forming the
// floor and carrying material out of a low front opening, a paddled
// metering drum over that opening that levels the burden into an even
// carpet, a chain-drive motor on the head shaft, and a stout leg frame
// with a service platform beside the drum.
// Generic visualization geometry at about real size (6.5 m long, 3.4 m
// wide, 3.6 m high), millimetres, Z up, material leaves toward -Y.

meta({
  name: "infeed-hopper",
  license: 'CC0-1.0',
  title: "Infeed hopper",
  description: "Loader-fed infeed hopper at about real size: flared open hopper with raised loader wall and bolted wear plates, steel-pan apron conveyor floor exiting a low front opening, paddled metering drum levelling the burden, chain-drive motor on the head shaft, leg frame and service platform with handrail. Material controls: hopper paint, wear-plate steel, apron pans and drum, safety trim; mixed recyclables, cardboard or containers in the hopper. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "infeed hopper", "receiving hopper", "apron feeder", "metering drum", "loader", "tipping floor", "sort line", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hopper = param('hopper', '#3a6e8f', { label: 'Hopper and frame (paint)' });
const wear = param('wear', '#8d9296', { label: 'Wear plates (abrasion-resistant steel)' });
const pans = param('pans', '#4b5054', { label: 'Apron pans, chain and drum' });
const trim = param('trim', '#f0b429', { label: 'Guards, rails and safety trim' });
const load = param('load', 'mixed', { choices: ['mixed', 'cardboard', 'containers', 'empty'], label: 'Material in hopper' });

presets({
  plant: { hopper: '#3a6e8f', wear: '#8d9296', pans: '#4b5054', trim: '#f0b429' },
  weathered: { hopper: '#5d6a6e', wear: '#7d6a58', pans: '#3f3c38', trim: '#a8893f' },
  stainless: { hopper: '#c6cbcd', wear: '#a7adb0', pans: '#5a6064', trim: '#2f5d9a' },
  highVisibility: { hopper: '#2f8f4e', wear: '#9aa0a3', pans: '#2b2f31', trim: '#f2d21b' },
});

const p = assembly("infeed-hopper");
// Built with the outlet toward +Y, then turned so the outlet faces -Y.
const add = (name: string, shape: Shape) => p.part(name, shape.rotateZ(180).scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// (x, z) cross-section extruded along Y from y0 to y1.
const alongY = (pts, y0: number, y1: number) => extrudePolygon(pts, y1 - y0).rotateX(90).translate(0, y1, 0);
// Shaft or roller along X from x0, axis at (y, z).
const alongX = (x0: number, len: number, r: number, y: number, z: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

const ZF = 1100, BW = 1400; // apron floor height, apron width
const Y0 = -3000, Y1 = 2600, YF = 1800; // hopper back, apron head, front wall
const ZT = 3200; // hopper rim height

// Flared hopper: (x, z) cross-section with sloped side walls, opened up top.
const outer = [[-BW / 2 - 60, ZF - 40], [BW / 2 + 60, ZF - 40], [1700, ZT], [-1700, ZT]];
const inner = [[-BW / 2, ZF], [BW / 2, ZF], [1620, ZT + 50], [-1620, ZT + 50]];
add("hopper-body", alongY(outer, Y0, YF).subtract(alongY(inner, Y0 + 80, YF - 80)).color(hopper));
// Raised loader-side back wall leaning out, and a lower front wall over the outlet.
add("loader-wall", profileYZ([[Y0, ZF - 40], [Y0 + 80, ZF - 40], [Y0 - 400, ZT + 400], [Y0 - 480, ZT + 400]], 3400).color(hopper));
add("front-wall", blk(0, YF - 40, ZF + 900, 3300, 80, ZT - ZF - 900).color(hopper));
for (const sx of [-1, 1]) add(`rim-${sx}`, blk(sx * 1700, (Y0 + YF) / 2, ZT, 120, YF - Y0 + 120, 80).color(trim));
add("rim-front", blk(0, YF, ZT, 3520, 120, 80).color(trim));
// Bolted wear plates on the sloped walls.
for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
  const y = Y0 + 500 + k * 1150;
  add(`wear-plate-${s}-${k}`, box(30, 1000, 1700, true).rotateY(s * 25.5).translate(s * 1130, y, ZF + 1050).color(wear));
}
add("loader-wear-plate", box(3000, 30, 1600, true).rotateX(-14).translate(0, Y0 - 160, ZF + 1300).color(wear));

// Apron conveyor floor: overlapping steel pans on side chains, out to the head.
for (let k = 0; k < 18; k++) add(`pan-${k}`, blk(0, Y0 + 150 + k * 300, ZF - 30, BW - 20, 280, 30).rotateX(-4).translate(0, 0, 10).color(pans));
for (const s of [-1, 1]) {
  add(`chain-${s}`, blk(s * (BW / 2 + 40), (Y0 + Y1) / 2, ZF - 140, 60, Y1 - Y0, 110).color(pans));
  add(`apron-side-${s}`, blk(s * (BW / 2 + 100), (YF + Y1) / 2, ZF - 200, 40, Y1 - YF, 700).color(hopper));
}
add("head-sprocket-shaft", alongX(-BW / 2 - 400, BW + 800, 70, Y1, ZF - 100).color(pans));
for (const s of [-1, 1]) add(`head-sprocket-${s}`, alongX(s * (BW / 2 + 40) - 40, 80, 220, Y1, ZF - 100, 10).color(pans));
add("tail-shaft", alongX(-BW / 2 - 200, BW + 400, 60, Y0 + 100, ZF - 100).color(pans));

// Metering drum: shaft with paddles over the low front opening.
const DY = YF + 350, DZ = ZF + 700;
add("drum-core", alongX(-BW / 2, BW, 200, DY, DZ, 16).color(pans));
for (let k = 0; k < 6; k++) add(`drum-paddle-${k}`, box(BW - 40, 40, 230, true).translate(0, 0, 300).rotateX(k * 60).translate(0, DY, DZ).color(wear));
add("drum-shaft", alongX(-BW / 2 - 450, BW + 900, 60, DY, DZ).color(pans));
for (const s of [-1, 1]) add(`drum-bearing-${s}`, blk(s * (BW / 2 + 240), DY, DZ - 120, 200, 260, 240).color('#5a6266'));
add("drum-hood", alongX(-BW / 2 - 160, BW + 320, 560, DY, DZ, 16).subtract(alongX(-BW / 2 - 200, BW + 400, 500, DY, DZ, 16)).subtract(blk(0, DY - 300, DZ - 700, BW + 500, 1400, 760)).color(hopper));

// Drives: apron motor-gearbox on the head shaft, drum motor with chain guard.
add("apron-gearbox", blk(BW / 2 + 500, Y1, ZF - 400, 340, 520, 560).color('#3d4448'));
add("apron-motor", cylinder(650, 170, 14).rotateX(-90).translate(BW / 2 + 500, Y1 - 900, ZF - 200).color(hopper));
add("drum-motor", cylinder(560, 150, 14).rotateX(-90).translate(-BW / 2 - 560, DY - 700, DZ + 380).color(hopper));
add("drum-chain-guard", blk(-BW / 2 - 460, DY - 150, DZ - 140, 80, 700, 700).color(trim));

// Leg frame.
for (const s of [-1, 1]) for (const y of [Y0 + 200, -600, YF, Y1 - 200]) add(`leg-${s}-${y}`, blk(s * (BW / 2 + 260), y, 0, 180, 180, ZF - 200).color(hopper));
for (const s of [-1, 1]) add(`base-rail-${s}`, blk(s * (BW / 2 + 260), (Y0 + Y1) / 2, 0, 240, Y1 - Y0, 120).color(hopper));

// Service platform beside the drum on +X, with handrail and steps.
const PX = BW / 2 + 1200;
add("platform", blk(PX, DY - 300, ZF - 200, 900, 1400, 50).color('#5a6266'));
for (const [i, y] of [DY - 950, DY + 350].entries()) {
  add(`platform-leg-${i}`, blk(PX + 380, y, 0, 80, 80, ZF - 200).color(trim));
  add(`rail-post-${i}`, blk(PX + 420, y, ZF - 150, 50, 50, 1050).color(trim));
}
add("handrail", blk(PX + 420, DY - 300, ZF + 850, 50, 1400, 50).color(trim));
add("midrail", blk(PX + 420, DY - 300, ZF + 350, 40, 1400, 40).color(trim));
for (let k = 0; k < 4; k++) add(`step-${k}`, blk(PX, DY - 1150 - k * 260, ZF - 200 - (k + 1) * 220, 800, 260, 40).color('#5a6266'));

// Burden heaped in the hopper and the levelled carpet leaving on the apron.
if (load.value !== 'empty') {
  const col = load.value === 'cardboard' ? ['#b08a5a', '#c9a777', '#8f6d45'] : load.value === 'containers' ? ['#5c8fc4', '#d9d9d2', '#c8402a'] : ['#8a6f55', '#c8a23a', '#5c8fc4'];
  add("heap", alongY([[-680, ZF + 20], [680, ZF + 20], [1240, ZF + 1300], [300, ZF + 1750], [-1150, ZF + 1250]], Y0 + 300, YF - 300).color(col[0]));
  add("carpet", blk(0, (YF + Y1) / 2, ZF + 10, BW - 120, Y1 - YF, 220).color(col[0]));
  for (let k = 0; k < 7; k++) add(`lump-${k}`, box(420, 320, 200, true).rotateZ(25 * k).rotateY(12 * k).translate(-700 + (k % 4) * 450, Y0 + 700 + k * 550, ZF + 1450 + (k % 3) * 150).color(col[1 + (k % 2)]));
}

return p.model();
