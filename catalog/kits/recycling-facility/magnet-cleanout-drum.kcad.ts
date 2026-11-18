// SPDX-License-Identifier: CC0-1.0
// Magnetic drum separator ("magnet clean-out drum"): pulls tramp steel out
// of a mixed stream before it reaches a shredder or a screen. A vibrating
// feed pan on coil springs walks the mix onto the top of a turning
// stainless drum. A fixed magnet sector inside the shell holds the steel
// against the drum as it turns under, while everything non-magnetic flies
// off the front into the product chute. Past the splitter plate the steel
// leaves the magnet field and drops into the ferrous chute behind. What
// makes it a drum magnet rather than a conveyor head: the big horizontal
// stainless drum under a curved hood, the splitter plate under it, the two
// chutes into two bins, and steel scrap clinging to the underside of the
// drum. Generic visualization geometry at about real size (5.2 m long,
// 2.1 m wide, 2.6 m high), millimetres, Z up, flow toward +X.

meta({
  name: "magnet-cleanout-drum",
  license: 'CC0-1.0',
  title: "Magnet clean-out drum",
  description: "Magnetic drum separator at about real size: vibrating feed pan on coil springs with twin vibrator motors, horizontal stainless drum on bearing posts with a side gear motor, curved hood, splitter plate, product chute into a non-ferrous bin and ferrous chute into a steel scrap bin, with steel pieces held on the drum underside. Material controls: frame paint, stainless drum, hood paint, steel scrap. plant, weathered, highVisibility and stainless presets.",
  tags: ["recycling", "magnetic separator", "drum magnet", "ferrous recovery", "tramp metal", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f5f8f', { label: 'Frame, feeder and bin paint' });
const drum = param('drum', '#b9c3c7', { label: 'Drum shell (stainless steel)' });
const hood = param('hood', '#d9a521', { label: 'Hood and ferrous bin paint' });
const scrap = param('scrap', '#8a5636', { label: 'Steel scrap (rusty)' });

presets({
  plant: { frame: '#2f5f8f', drum: '#b9c3c7', hood: '#d9a521', scrap: '#8a5636' },
  weathered: { frame: '#4c5d66', drum: '#9aa1a2', hood: '#a68745', scrap: '#6e4a33' },
  highVisibility: { frame: '#2b2f33', drum: '#c9d0d3', hood: '#e8542a', scrap: '#94603c' },
  stainless: { frame: '#8d969b', drum: '#d4dadc', hood: '#3c7d5a', scrap: '#7d5236' },
});

const p = assembly("magnet-cleanout-drum");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const taper = (w0: number, d0: number, a: [number, number, number], w1: number, d1: number, b: [number, number, number]) => rect(w0, d0).loft([rect(w1, d1)], {
  planes: [{ plane: 'XY' as const, origin: a }, { plane: 'XY' as const, origin: b }],
  ruled: true,
});
const openBin = (x: number, w: number, d: number, h: number) => blk(x, 0, 0, w, d, h).subtract(blk(x, 0, 70, w - 90, d - 90, h));
const dark = '#2a2e31';

// Drum: axis along Y, centre (DX, DZ).
const DX = 400, DZ = 1500, R = 450, DW = 1400;
add("drum-shell", cylinder(DW, R, 28).rotateX(90).translate(DX, DW / 2, DZ).color(drum));
add("drum-end-f", cylinder(30, R + 25, 28).rotateX(90).translate(DX, -DW / 2, DZ).color(drum));
add("drum-hub-f", cylinder(40, 160, 16).rotateX(90).translate(DX, -DW / 2 - 30, DZ).color(dark));
add("drum-end-b", cylinder(30, R + 25, 28).rotateX(90).translate(DX, DW / 2 + 30, DZ).color(dark));
add("drum-shaft", cylinder(2000, 70, 12).rotateX(90).translate(DX, 1000, DZ).color(dark));
for (const s of [-1, 1]) {
  add(`bearing-${s < 0 ? 'f' : 'b'}`, blk(DX, s * 880, DZ - 120, 280, 170, 220).color(dark));
  add(`post-${s < 0 ? 'f' : 'b'}`, blk(DX, s * 880, 0, 220, 170, DZ - 120).color(frame));
  add(`post-foot-${s < 0 ? 'f' : 'b'}`, blk(DX, s * 880, 0, 420, 320, 40).color(frame));
}
add("post-tie", blk(DX, 0, 1000, 160, 1600, 160).color(frame));
// Gear motor on the back end of the shaft.
add("gearbox", blk(DX, 1100, DZ - 200, 380, 240, 400).color(frame));
add("gear-motor", cylinder(520, 150, 16).rotateY(90).translate(DX + 190, 1100, DZ - 40).color(dark));
add("motor-fan-cover", cylinder(80, 165, 16).rotateY(90).translate(DX + 710, 1100, DZ - 40).color(dark));
add("motor-stand", blk(DX + 300, 1100, 0, 700, 200, DZ - 380).color(frame));

// Curved hood over the front-top of the drum: an arc shell from 25° to 105°.
const hoodPts: [number, number][] = [];
for (let k = 0; k <= 10; k++) {
  const a = (25 + k * 8) * Math.PI / 180;
  hoodPts.push([DX + 560 * Math.cos(a), DZ + 560 * Math.sin(a)]);
}
for (let k = 10; k >= 0; k--) {
  const a = (25 + k * 8) * Math.PI / 180;
  hoodPts.push([DX + 515 * Math.cos(a), DZ + 515 * Math.sin(a)]);
}
add("hood", profileXZ(hoodPts, DW + 140).color(hood));
add("hood-front-lip", blk(DX + 560, 0, DZ - 120, 50, DW + 140, 220).color(hood));
for (const s of [-1, 1]) add(`hood-cheek-${s < 0 ? 'f' : 'b'}`, profileXZ([[DX, DZ], ...hoodPts.slice(0, 11)], 20).translate(0, s * (DW / 2 + 80), 0).color(hood));

// Splitter plate under the drum separates product (front) from steel (back).
add("splitter", profileXZ([[DX + 20, DZ - R - 40], [DX + 60, DZ - R - 40], [DX + 10, 960], [DX - 30, 960]], DW).color(drum));

// Chutes into the two bins.
add("product-chute", taper(620, DW, [DX + 360, 0, 960], 640, DW - 100, [DX + 900, 0, 720]).color(frame));
add("ferrous-chute", taper(520, DW, [DX - 300, 0, 960], 520, DW - 100, [DX - 650, 0, 720]).color(hood));
add("product-bin", openBin(DX + 1050, 1100, 1700, 650).color(frame));
add("ferrous-bin", openBin(DX - 760, 900, 1700, 650).color(hood));

// Vibrating feed pan delivering onto the top-back of the drum.
const PX0 = -2500, PX1 = DX - 330, PW = 1300;
const zAt = (x: number) => 1990 - (x - PX0) * 120 / (PX1 - PX0);
add("pan-floor", profileXZ([[PX0, zAt(PX0)], [PX1, zAt(PX1)], [PX1, zAt(PX1) - 40], [PX0, zAt(PX0) - 40]], PW).color(frame));
for (const s of [-1, 1]) {
  add(`pan-wall-${s < 0 ? 'f' : 'b'}`, profileXZ([[PX0, zAt(PX0) - 40], [PX1, zAt(PX1) - 40], [PX1, zAt(PX1) + 220], [PX0, zAt(PX0) + 280]], 30).translate(0, s * (PW / 2 + 15), 0).color(frame));
  add(`vibrator-${s < 0 ? 'f' : 'b'}`, cylinder(300, 140, 14).rotateX(90).translate(-1300, s < 0 ? -PW / 2 - 30 : PW / 2 + 330, zAt(-1300) + 90).color(dark));
  for (const lx of [-2300, -300]) {
    const top = zAt(lx) - 340;
    add(`leg-${s < 0 ? 'f' : 'b'}-${lx}`, blk(lx, s * 950, 0, 160, 160, top).color(frame));
    add(`leg-foot-${s < 0 ? 'f' : 'b'}-${lx}`, blk(lx, s * 950, 0, 300, 300, 30).color(frame));
    for (let k = 0; k < 3; k++) add(`spring-${s < 0 ? 'f' : 'b'}-${lx}-${k}`, torus(80, 20, 8).translate(lx, s * 950, top + 60 + k * 85).color(hood));
    add(`spring-bracket-${s < 0 ? 'f' : 'b'}-${lx}`, blk(lx, s * 850, top + 280, 240, 400, 60).color(frame));
  }
}
add("pan-back", blk(PX0 - 15, 0, zAt(PX0) - 40, 30, PW + 60, 320).color(frame));

// Mixed feed walking down the pan: cans, plastic lumps and steel offcuts.
const mixCols = ['#c9c2b0', '#6f8fa8', '#a83c32', '#d8d2c0'];
for (let i = 0; i < 16; i++) {
  const x = PX0 + 250 + (i % 8) * 340 + ((i * 41) % 90);
  const y = -PW / 2 + 260 + Math.floor(i / 8) * 520 + ((i * 67) % 160);
  const r = 110 + ((i * 29) % 70);
  add(`feed-${i}`, box(r * 1.6, r, r * 0.7, true).rotateZ(i * 47).rotateY(i * 13).translate(x, y, zAt(x) + r * 0.4).color(i % 4 === 1 ? scrap : mixCols[i % 4]));
}
// Steel held on the drum underside, between 225° and 300° (the magnet sector).
for (let i = 0; i < 7; i++) {
  const a = (225 + i * 12) * Math.PI / 180;
  const y = -DW / 2 + 180 + ((i * 433) % (DW - 360));
  add(`held-steel-${i}`, box(150, 90 + (i % 3) * 30, 40, true).rotateY(-(225 + i * 12) + 90).translate(DX + (R + 18) * Math.cos(a), y, DZ + (R + 18) * Math.sin(a)).color(scrap));
}
// Bin contents.
for (let i = 0; i < 9; i++) {
  const x = DX - 760 - 300 + (i % 3) * 300;
  const y = -550 + Math.floor(i / 3) * 520 + ((i * 37) % 120);
  add(`ferrous-load-${i}`, box(220, 120, 70, true).rotateZ(i * 53).rotateX(i * 17).translate(x, y, 470 + (i % 2) * 60).color(scrap));
}
for (let i = 0; i < 9; i++) {
  const x = DX + 1050 - 330 + (i % 3) * 330;
  const y = -550 + Math.floor(i / 3) * 520 + ((i * 59) % 120);
  add(`product-load-${i}`, box(240, 160, 110, true).rotateZ(i * 41).rotateY(i * 23).translate(x, y, 470 + (i % 2) * 60).color(mixCols[(i + 2) % 4 === 1 ? 0 : (i + 2) % 4]));
}

return p.model();
