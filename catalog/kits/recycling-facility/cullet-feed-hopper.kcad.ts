// SPDX-License-Identifier: CC0-1.0
// Cullet feed hopper: the elevated surge bin that feeds crushed glass
// (cullet) into a glass-processing line at a steady rate. A square steel
// bin with a steep pyramid bottom stands on four braced legs with a
// caged ladder and a railed top walkway for inspecting the load. Under the
// outlet a slide gate drops cullet onto a stainless vibratory feeder tray
// hung on coil springs, which trickles it onto an inclined belt conveyor
// toward the next machine. What makes it a cullet hopper rather than a
// silo: the open top heaped with green, amber and flint glass, the steep
// pyramid outlet, the sprung vibratory tray and the rising belt carrying
// glass chips. Generic visualization geometry at about real size (6.2 m
// long, 2.6 m wide, 4.6 m high), millimetres, Z up, flow toward +X.

meta({
  name: "cullet-feed-hopper",
  license: 'CC0-1.0',
  title: "Cullet feed hopper",
  description: "Elevated cullet feed hopper at about real size: open-top square bin with a steep pyramid outlet heaped with green, amber and flint glass, four braced legs, caged access ladder and railed top walkway, slide gate over a stainless vibratory feeder tray on coil springs with a vibrator motor, and an inclined belt conveyor carrying glass chips away. Material controls: hopper paint, structure paint, stainless feeder, glass cullet. glassworks, weathered, highVisibility and amberCullet presets.",
  tags: ["recycling", "glass recycling", "cullet", "feed hopper", "vibratory feeder", "surge bin", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const hopper = param('hopper', '#3d6f8e', { label: 'Hopper paint' });
const structure = param('structure', '#d2a12a', { label: 'Legs, ladder and rail paint' });
const feeder = param('feeder', '#b9c1c4', { label: 'Vibratory feeder (stainless steel)' });
const cullet = param('cullet', '#3f8f5a', { label: 'Glass cullet' });

presets({
  glassworks: { hopper: '#3d6f8e', structure: '#d2a12a', feeder: '#b9c1c4', cullet: '#3f8f5a' },
  weathered: { hopper: '#4f6670', structure: '#a38b4f', feeder: '#9da3a3', cullet: '#4c7d5c' },
  highVisibility: { hopper: '#2b2f33', structure: '#e8c22a', feeder: '#c8cfd2', cullet: '#4fa36a' },
  amberCullet: { hopper: '#6e3b2c', structure: '#3d6f8e', feeder: '#b9c1c4', cullet: '#a8662a' },
});

const p = assembly("cullet-feed-hopper");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const taper = (w0: number, d0: number, a: [number, number, number], w1: number, d1: number, b: [number, number, number]) => rect(w0, d0).loft([rect(w1, d1)], {
  planes: [{ plane: 'XY' as const, origin: a }, { plane: 'XY' as const, origin: b }],
  ruled: true,
});
const dark = '#2a2e31';
const glassCols = ['#8a5a26', '#d8e4df', '#2f6f45'];

// Bin: pyramid bottom from ZO to ZB, straight box to ZT; legs at the corners.
const HX = -1400, HW = 2200, ZO = 1900, ZB = 3100, ZT = 4100, LI = HW / 2 - 90;
add("hopper-cone", taper(420, 420, [HX, 0, ZO], HW, HW, [HX, 0, ZB]).color(hopper));
add("hopper-bin", blk(HX, 0, ZB, HW, HW, ZT - ZB).subtract(blk(HX, 0, ZB + 40, HW - 70, HW - 70, ZT - ZB)).color(hopper));
for (const z of [ZB + 330, ZB + 660]) add(`stiffener-${z}`, blk(HX, 0, z, HW + 70, HW + 70, 70).subtract(blk(HX, 0, z - 10, HW - 20, HW - 20, 90)).color(hopper));
add("cullet-heap", taper(HW - 80, HW - 80, [HX, 0, ZT - 180], 420, 380, [HX - 150, 120, ZT + 380]).color(cullet));
for (let i = 0; i < 14; i++) {
  const x = HX - 800 + (i % 5) * 400 + ((i * 41) % 80);
  const y = -800 + Math.floor(i / 5) * 650 + ((i * 59) % 120);
  const rise = 380 * (1 - Math.max(Math.abs(x - HX + 150), Math.abs(y - 120)) / (HW / 2));
  add(`chip-${i}`, box(150, 110, 60, true).rotateX(i * 37).rotateZ(i * 53).translate(x, y, ZT - 120 + Math.max(0, rise)).color(glassCols[i % 3]));
}

for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    add(`leg-${sx}-${sy}`, blk(HX + sx * LI, sy * LI, 0, 180, 180, ZB).color(structure));
    add(`leg-foot-${sx}-${sy}`, blk(HX + sx * LI, sy * LI, 0, 380, 380, 30).color(structure));
  }
  // Cross bracing on the front/back faces and the side faces.
  add(`brace-xz-${sx}`, profileXZ([[HX - LI + 90, 300], [HX + LI - 90, ZO - 300], [HX + LI - 90, ZO - 180], [HX - LI + 90, 420]], 50).translate(0, sx * LI, 0).color(structure));
  add(`brace-xz-r-${sx}`, profileXZ([[HX + LI - 90, 300], [HX - LI + 90, ZO - 300], [HX - LI + 90, ZO - 180], [HX + LI - 90, 420]], 50).translate(0, sx * LI, 0).color(structure));
  add(`tie-x-${sx}`, blk(HX, sx * LI, ZO - 180, 2 * LI, 120, 120).color(structure));
  add(`tie-y-${sx}`, blk(HX + sx * LI, 0, ZO - 180, 120, 2 * LI, 120).color(structure));
}

// Top walkway along the front edge with a handrail, reached by a caged ladder.
add("walkway", blk(HX, -HW / 2 - 450, ZT - 140, HW + 400, 800, 50).color(structure));
for (const x of [HX - HW / 2 - 150, HX, HX + HW / 2 + 150]) add(`rail-post-${x}`, blk(x, -HW / 2 - 820, ZT - 90, 50, 50, 1050).color(structure));
for (const z of [ZT + 450, ZT + 920]) add(`handrail-${z}`, blk(HX, -HW / 2 - 820, z, HW + 350, 50, 50).color(structure));
add("walkway-bracket", blk(HX, -HW / 2 - 450, ZT - 340, 160, 800, 200).color(structure));
const LX = HX - HW / 2 - 50, LY = -HW / 2 - 700;
for (const sy of [-1, 1]) add(`ladder-rail-${sy}`, blk(LX - 250, LY + sy * 220, 0, 50, 50, ZT - 90).color(structure));
for (let k = 0; k < 13; k++) add(`ladder-rung-${k}`, blk(LX - 250, LY, 300 + k * 300, 40, 440, 30).color(structure));
for (let k = 0; k < 6; k++) add(`cage-hoop-${k}`, torus(330, 22, 6).translate(LX - 520, LY, 2200 + k * 360).color(structure));
for (const sy of [-1, 0, 1]) add(`cage-strap-${sy}`, blk(LX - 520 - (sy === 0 ? 330 : 0), LY + sy * 330, 2180, 40, 40, ZT - 2180 + 900).color(structure));

// Slide gate and vibratory feeder tray on springs.
add("slide-gate", blk(HX, 0, ZO - 160, 600, 520, 160).color(dark));
add("gate-ram", cylinder(700, 50, 10).rotateY(-90).translate(HX - 300, 0, ZO - 80).color(feeder));
const TZ = 1300, TX0 = HX - 500, TX1 = HX + 1500, TWD = 760;
add("feeder-tray", profileXZ([[TX0, TZ + 120], [TX1, TZ], [TX1, TZ - 50], [TX0, TZ + 70]], TWD).color(feeder));
for (const s of [-1, 1]) add(`tray-side-${s < 0 ? 'f' : 'b'}`, profileXZ([[TX0, TZ + 70], [TX1, TZ - 50], [TX1, TZ + 200], [TX0, TZ + 360]], 25).translate(0, s * (TWD / 2 + 12), 0).color(feeder));
add("tray-back", blk(TX0 - 12, 0, TZ + 70, 25, TWD + 50, 290).color(feeder));
add("tray-inlet", taper(500, 440, [HX, 0, TZ + 300], 600, 520, [HX, 0, ZO - 160]).color(feeder));
add("vibrator-motor", cylinder(420, 140, 14).rotateX(90).translate(HX + 600, -TWD / 2 - 30, TZ - 100).color(dark));
for (const s of [-1, 1]) {
  for (const sx of [TX0 + 200, TX1 - 200]) {
    add(`tray-hanger-${s < 0 ? 'f' : 'b'}-${sx}`, blk(sx, s * (TWD / 2 + 110), TZ - 420, 120, 120, 380).color(feeder));
    for (let k = 0; k < 3; k++) add(`spring-${s < 0 ? 'f' : 'b'}-${sx}-${k}`, torus(70, 18, 8).translate(sx, s * (TWD / 2 + 110), TZ - 640 + k * 70).color(structure));
    add(`spring-post-${s < 0 ? 'f' : 'b'}-${sx}`, blk(sx, s * (TWD / 2 + 110), 0, 140, 140, TZ - 700).color(structure));
  }
}
for (let i = 0; i < 8; i++) {
  const x = TX0 + 200 + i * 220;
  add(`tray-chip-${i}`, box(120, 90, 50, true).rotateZ(i * 61).rotateX(i * 23).translate(x, -200 + ((i * 137) % 400), TZ + 120 - (x - TX0) * 0.06).color(glassCols[i % 3]));
}

// Inclined belt conveyor rising toward +X, fed off the end of the tray.
const CX0 = TX1 - 100, CZ0 = 900, CL = 3200, RISE = 16, CW = 650;
const conv = (s: Shape) => s.rotateY(-RISE).translate(CX0, 0, CZ0);
add("conveyor-belt", conv(blk(CL / 2, 0, 0, CL, CW, 30)).color(dark));
add("conveyor-stringer", conv(blk(CL / 2, 0, -220, CL, CW + 60, 200)).color(hopper));
for (const s of [-1, 1]) add(`conveyor-skirt-${s < 0 ? 'f' : 'b'}`, conv(blk(CL / 2, s * (CW / 2 - 20), 30, CL - 200, 20, 140)).color(feeder));
add("head-pulley", conv(cylinder(CW + 40, 140, 14).rotateX(90).translate(CL, CW / 2 + 20, -100)).color(feeder));
add("tail-pulley", conv(cylinder(CW + 40, 140, 14).rotateX(90).translate(0, CW / 2 + 20, -100)).color(feeder));
for (let k = 0; k < 7; k++) add(`belt-chip-${k}`, conv(box(110, 80, 45, true).rotateZ(k * 47).translate(250 + k * 420, -150 + ((k * 151) % 300), 55)).color(glassCols[k % 3]));
const tan = Math.tan(RISE * Math.PI / 180);
for (const d of [500, 2600]) {
  const zTop = CZ0 + d * tan - 240;
  for (const s of [-1, 1]) add(`conv-leg-${d}-${s < 0 ? 'f' : 'b'}`, blk(CX0 + d * Math.cos(RISE * Math.PI / 180), s * (CW / 2 - 10), 0, 90, 90, zTop).color(structure));
}

return p.model();
