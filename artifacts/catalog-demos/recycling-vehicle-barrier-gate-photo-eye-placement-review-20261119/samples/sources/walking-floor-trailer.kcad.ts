// SPDX-License-Identifier: CC0-1.0
// Walking-floor trailer: the bulk semi-trailer that hauls shredded green
// waste, woodchip and RDF out of a recycling site and unloads itself without
// tipping. What makes it a walking-floor trailer rather than any box
// trailer: tall aluminium sides with external stakes, an open top under
// cross bows with the sliding tarp rolled to the front, rear barn doors
// swung right back along the sides, and a floor of long aluminium slats that
// shuffle the load out of the back. Underneath: a tri-axle air-suspension
// bogie on wide single tyres, landing legs and the hydraulic pack at the
// front that drives the floor.
// Generic visualization geometry at about real size (13.6 m long, 2.55 m
// wide, 4 m high), millimetres, Z up, rear doors toward -Y.

meta({
  name: "walking-floor-trailer",
  license: 'CC0-1.0',
  title: "Walking-floor trailer",
  description: "Tri-axle walking-floor bulk semi-trailer at about real size: aluminium sides with external stakes, open top with cross bows and a rolled sliding tarp, rear barn doors swung back along the sides, moving-floor slats with a woodchip or green-waste load, air-suspension bogie on wide single tyres, landing legs and front hydraulic pack. Material controls: body sides, chassis, tarp, tyres; woodchip, green-waste or empty load. aluminium, haulierRed, fleetGreen and weathered presets.",
  tags: ['walking floor', 'moving floor', 'trailer', 'semi-trailer', 'bulk trailer', 'tri-axle', 'woodchip', 'green waste', 'haulage', 'recycling', 'waste management', 'vehicle', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#dfe3e6', { label: 'Body sides and doors (aluminium)' });
const chassis = param('chassis', '#2c3034', { label: 'Chassis, bogie and stakes (paint)' });
const tarp = param('tarp', '#3f6a4a', { label: 'Sliding tarp (PVC)' });
const rubber = param('rubber', '#232527', { label: 'Tyres (rubber)' });
const load = param('load', 'woodchip', { choices: ['woodchip', 'greenWaste', 'empty'], label: 'Load' });

presets({
  aluminium: { body: '#dfe3e6', chassis: '#2c3034', tarp: '#3f6a4a', rubber: '#232527' },
  haulierRed: { body: '#b8282c', chassis: '#25282b', tarp: '#2f3b55', rubber: '#232527' },
  fleetGreen: { body: '#2f6a46', chassis: '#c9ced2', tarp: '#e1ddd0', rubber: '#232527' },
  weathered: { body: '#9a9c96', chassis: '#4a3f38', tarp: '#5c6248', rubber: '#3a3936' },
});

const p = assembly("walking-floor-trailer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);

const L = 13600, W = 2550, ZF = 1250, H = 2700, T = 40;
const ZT = ZF + H;

// Floor deck and the walking-floor slats (alternate slats in a darker alloy).
add("floor-deck", blk(0, L / 2, ZF - 100, W, L, 100).color(chassis));
const SN = 21, SW = (W - 2 * T) / SN;
for (let i = 0; i < SN; i++) {
  add(`slat-${i}`, blk(-W / 2 + T + SW * (i + 0.5), L / 2 - (i % 3) * 60, ZF, SW - 14, L - 200, 22).color(i % 3 === 0 ? '#8e9599' : '#b3babd'));
}

// Sides, front wall, top rails and external stakes.
for (const s of [-1, 1]) {
  add(`side-${s}`, blk(s * (W / 2 - T / 2), L / 2, ZF, T, L, H).color(body));
  add(`top-rail-${s}`, blk(s * (W / 2 - T / 2), L / 2, ZT - 10, T + 40, L, 80).color(chassis));
  add(`bottom-rail-${s}`, blk(s * (W / 2 + 10), L / 2, ZF - 120, 60, L, 180).color(chassis));
  for (let k = 0; k <= 12; k++) add(`stake-${s}-${k}`, blk(s * (W / 2 + 25), 100 + k * 1116, ZF - 120, 50, 90, H + 120).color(chassis));
  add(`marker-${s}`, blk(s * (W / 2 + 52), L / 2, ZF - 60, 8, 160, 60).color('#f29a1d'));
}
add("front-wall", blk(0, L - T / 2, ZF, W, T, H + 80).color(body));
add("rear-frame-top", blk(0, 40, ZT - 60, W + 80, 80, 140).color(chassis));
for (const s of [-1, 1]) add(`rear-post-${s}`, blk(s * (W / 2 + 10), 40, ZF - 120, 100, 80, H + 120).color(chassis));

// Open top: cross bows, the tarp rolled up at the front and its sliding rails.
for (let k = 0; k < 8; k++) add(`bow-${k}`, blk(0, 900 + k * 1600, ZT + 70, W, 60, 50).color(chassis));
add("tarp-roll", cylX(-W / 2 - 30, L - 700, ZT + 230, W + 60, 230, 14).color(tarp));
add("tarp-flap", blk(0, L - 300, ZT + 60, W + 40, 600, 60).color(tarp));
for (const s of [-1, 1]) add(`tarp-strap-${s}`, blk(s * 700, L - 700, ZT + 20, 80, 480, 440).color(chassis));

// Rear barn doors swung right back against the sides, hinges at the rear posts.
for (const s of [-1, 1]) {
  const door = blk(s * W / 4, 0, ZF, W / 2, T, H).color(body);
  const hx = s * W / 2;
  add(`door-${s}`, door.translate(-hx, 0, 0).rotateZ(-s * 90).translate(hx + s * 75, 0, 0));
  for (const z of [ZF + 500, ZF + H - 500]) add(`door-hinge-${s}-${z}`, blk(s * (W / 2 + 40), 30, z, 70, 60, 120).color(chassis));
  add(`door-bar-${s}`, cylZ(s * (W / 2 + 105), W / 4, ZF + 150, H - 300, 22, 8).color('#9aa0a4'));
}

// Load: a heap of woodchip or shredded green waste sloping down to the doors.
if (load.value !== 'empty') {
  const c = load.value === 'woodchip' ? ['#b88a52', '#a07440', '#c89e66'] : ['#5f7a36', '#6d5a3a', '#7a8f3e'];
  const heap = (y: number, r: number, zc: number) => sphere(r).subtract(box(3 * r, 3 * r, 2 * r, true).translate(0, 0, -r)).translate(0, y, zc);
  add("load-bed", blk(0, L / 2 + 600, ZF + 22, W - 2 * T, L - 1600, 1500).color(c[0]));
  add("load-heap-rear", heap(1400, 1220, ZF + 600).color(c[1]));
  add("load-heap-mid", heap(4200, 1240, ZF + 1050).color(c[2]));
}

// Main chassis beams, rear underrun bar, lights and number plate.
for (const s of [-1, 1]) add(`beam-${s}`, blk(s * 480, L / 2 + 200, ZF - 420, 140, L - 600, 320).color(chassis));
add("underrun-bar", blk(0, 120, 560, W - 200, 120, 140).color(chassis));
for (const s of [-1, 1]) {
  add(`underrun-hanger-${s}`, blk(s * 480, 140, 700, 100, 100, ZF - 1120).color(chassis));
  add(`tail-light-${s}`, blk(s * (W / 2 - 300), 50, 720, 420, 30, 110).color('#c8202a'));
  add(`indicator-${s}`, blk(s * (W / 2 - 560), 50, 720, 100, 30, 110).color('#f29a1d'));
}
add("number-plate", blk(0, 50, 700, 520, 20, 120).color('#f2d21b'));
add("plate-text", blk(0, 38, 735, 400, 6, 50).color('#1d2224'));

// Tri-axle air-suspension bogie on wide single tyres with mudguards.
const RT = 530;
for (const [i, y] of [1700, 3010, 4320].entries()) {
  add(`axle-${i}`, cylX(-W / 2 + 160, y, RT + 10, W - 320, 70, 10).color(chassis));
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -W / 2 + 10 : W / 2 - 390;
    add(`tyre-${i}-${s}`, cylX(x0, y, RT + 10, 380, RT, 18).color(rubber));
    add(`rim-${i}-${s}`, cylX(s < 0 ? x0 - 8 : x0 + 378, y, RT + 10, 10, 320, 14).color('#c3c8cb'));
    add(`hub-${i}-${s}`, cylX(s < 0 ? x0 - 40 : x0 + 386, y, RT + 10, 34, 120, 10).color('#7e8487'));
    add(`air-bag-${i}-${s}`, cylZ(s * 480, y + 420, RT + 60, 260, 130).color('#1d2224'));
  }
}
for (const s of [-1, 1]) {
  add(`mudguard-${s}`, blk(s * (W / 2 - 200), 3010, RT * 2 + 70, 440, 4000, 30).color(chassis));
  add(`hanger-front-${s}`, blk(s * 480, 1200, RT, 80, 160, ZF - 420 - RT).color(chassis));
  add(`flap-${s}`, blk(s * (W / 2 - 200), 900, 260, 420, 12, 800).color('#1d2224'));
}

// Landing legs with cross brace, sand shoes and wind handle.
const YL = L - 3200;
for (const s of [-1, 1]) {
  add(`landing-leg-${s}`, blk(s * 520, YL, 30, 120, 120, ZF - 450).color(chassis));
  add(`sand-shoe-${s}`, blk(s * 520, YL, 0, 280, 220, 30).color(chassis));
}
add("leg-brace", blk(0, YL, 500, 1040, 60, 80).color(chassis));
add("leg-gearbox", blk(-640, YL, ZF - 650, 160, 160, 180).color(chassis));
add("leg-handle", cylX(-940, YL, ZF - 560, 300, 18, 8).color('#9aa0a4'));

// Kingpin plate and the walking-floor hydraulic pack under the front.
add("kingpin-plate", blk(0, L - 1100, ZF - 160, 1600, 1600, 60).color(chassis));
add("kingpin", cylZ(0, L - 1100, ZF - 260, 100, 45, 10).color('#7e8487'));
add("hydraulic-pack", blk(0, L - 2200, ZF - 700, 900, 600, 600).color('#d9661e'));
add("hydraulic-tank", cylX(-450, L - 2700, ZF - 450, 900, 160, 12).color('#d9661e'));
add("control-box", blk(-W / 2 - 50, L - 900, ZF - 80, 100, 400, 500).color('#d9661e'));

return p.model();
