// SPDX-License-Identifier: CC0-1.0
// Primary shredder: the slow-speed twin-shaft shredder at the head of a
// waste or wood line, which tears bulky mixed waste into coarse chunks.
// What makes it that machine rather than a granulator or chipper: two
// parallel horizontal shafts carrying interleaved cutter discs with hooked
// teeth, set in a heavy open-bottomed cutting box under a flared feed
// hopper; a gearbox and big motor on the end of each shaft; a heavy leg
// frame that lifts the box high enough for a discharge belt to run out
// underneath carrying the shredded material away.
// Generic visualization geometry at about real size (5.4 m wide, 6 m
// long, 2.8 m high), millimetres, Z up, discharge toward -Y.

meta({
  name: "primary-shredder",
  license: 'CC0-1.0',
  title: "Primary shredder",
  description: "Slow-speed twin-shaft primary shredder at about real size: two shafts of interleaved hooked cutter discs in a heavy cutting box under a flared feed hopper, a gearbox and motor on each shaft end, a high leg frame and an inclined discharge belt carrying shredded material out underneath. Material controls: frame paint, hopper wear plate, cutters, drives. plant, weathered, untha and highVisibility presets.",
  tags: ["recycling", "shredder", "twin-shaft shredder", "pre-shredder", "slow-speed shredder", "bulky waste", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6a4c', { label: 'Frame and cutting box (paint)' });
const hopper = param('hopper', '#3c454c', { label: 'Feed hopper (wear plate)' });
const cutters = param('cutters', '#9aa2a7', { label: 'Shafts and cutter discs' });
const drive = param('drive', '#c7ccd0', { label: 'Gearboxes and motors' });

presets({
  plant: { frame: '#2f6a4c', hopper: '#3c454c', cutters: '#9aa2a7', drive: '#c7ccd0' },
  weathered: { frame: '#4f5a50', hopper: '#5a4e44', cutters: '#7c776e', drive: '#9a9c98' },
  untha: { frame: '#1f7a3a', hopper: '#2b2f33', cutters: '#b3b9bc', drive: '#1f7a3a' },
  highVisibility: { frame: '#d9692a', hopper: '#2f3438', cutters: '#b9c0c3', drive: '#f2c230' },
});

const p = assembly("primary-shredder");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();

const ZB = 1200, ZT = 2100, ZS = 1950; // cutting box bottom/top, shaft axis
const SY = 330; // shaft offset either side of centre

// Heavy leg frame lifting the cutting box clear of the discharge belt.
for (const [x, y] of [[-1100, -800], [1100, -800], [-1100, 800], [1100, 800]]) {
  add(`leg-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 220, 220, ZB).color(frame));
  add(`foot-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 360, 360, 30).color(frame));
}
for (const x of [-1100, 1100]) add(`side-brace-${x < 0 ? 'l' : 'r'}`, blk(x, 0, 520, 160, 1400, 160).color(frame));

// Open-bottomed cutting box with thick end walls carrying the bearings.
add("cutting-box", blk(0, 0, ZB, 2400, 1800, ZT - ZB).subtract(blk(0, 0, ZB - 50, 2200, 1400, ZT - ZB + 100)).color(frame));
for (const s of [-1, 1]) for (const y of [-SY, SY]) {
  add(`bearing-${s < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, cylinder(160, 230, 14).rotateY(90).translate(s < 0 ? -1360 : 1200, y, ZS).color(drive));
}
for (const x of [-700, 0, 700]) add(`box-rib-${x}`, blk(x, -940, ZB, 120, 80, ZT - ZB).color(frame));

// Two shafts of interleaved cutter discs with three hooked teeth each.
const tooth: [number, number][] = [[-60, 320], [60, 320], [130, 450], [10, 420]];
for (const [k, y] of [[0, -SY], [1, SY]] as [number, number][]) {
  add(`shaft-${k}`, cylinder(2700, 130, 12).rotateY(90).translate(-1350, y, ZS).color(cutters));
  for (let i = 0; i < 9; i++) {
    const x = -960 + i * 230 + k * 115;
    const dir = k === 0 ? 1 : -1;
    add(`disc-${k}-${i}`, cylinder(90, 340, 12).rotateY(90).translate(x - 45, y, ZS).color(cutters));
    for (let j = 0; j < 3; j++) {
      const a = dir * (j * 120 + i * 47);
      add(`tooth-${k}-${i}-${j}`, profileYZ(tooth.map(([u, v]) => [u * dir, v] as [number, number]), 90).rotateX(a).translate(x, y, ZS).color(cutters));
    }
  }
}

// Flared feed hopper, lined with wear plate, with a few chunks of bulky waste.
const hOut = rectPath(1200, 900).loft(rectPath(1700, 1400), { spacing: 700, ruled: true }).translate(0, 0, ZT);
const hIn = rectPath(1084, 784).loft(rectPath(1656, 1356), { spacing: 800, ruled: true }).translate(0, 0, ZT - 50);
add("feed-hopper", hOut.subtract(hIn).color(hopper));
add("hopper-rim", blk(0, 0, ZT + 700, 3500, 2900, 60).subtract(blk(0, 0, ZT + 690, 3300, 2700, 80)).color(frame));
const junk: [number, number, number, number, number, number, string][] = [
  [-750, 520, 520, 260, 180, 25, '#8a6a45'], [800, 560, 420, 300, 140, 60, '#5b7fa6'],
];
for (const [x, y, w, d, h, a, col] of junk) add(`waste-${x}`, box(w, d, h, true).rotateZ(a).rotateX(18).translate(x, y, ZS + 380).color(col));
add("warning-beacon", cylinder(160, 60, 10).translate(-1600, -1300, ZT + 760).color('#f0ae32'));

// Gearbox and motor on the -X end of each shaft, on a drive bench.
add("drive-bench", blk(-2250, 0, 1360, 1500, 1600, 70).color(frame));
for (const [x, y] of [[-2850, -650], [-1650, -650], [-2850, 650], [-1650, 650]]) add(`bench-leg-${x}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 160, 160, 1360).color(frame));
for (const [k, y] of [[0, -SY], [1, SY]] as [number, number][]) {
  add(`gearbox-${k}`, blk(-1750, y, 1430, 560, 420, 700).color(drive));
  add(`coupling-guard-${k}`, cylinder(260, 170, 12).rotateY(-90).translate(-2030, y, ZS - 150).color('#f0ae32'));
  add(`motor-${k}`, cylinder(780, 230, 14).rotateY(-90).translate(-2290, y, ZS - 150).color(drive));
  add(`motor-fan-cowl-${k}`, cylinder(120, 245, 14).rotateY(-90).translate(-3070, y, ZS - 150).color('#3d4448'));
  add(`terminal-box-${k}`, blk(-2600, y, ZS + 70, 220, 200, 160).color('#3d4448'));
}

// Control cabinet behind the drive bench.
add("control-cabinet", blk(-2300, 1350, 0, 900, 420, 1900).color(drive));
add("cabinet-door-line", blk(-2300, 1135, 100, 10, 10, 1700).color('#3d4448'));
add("cabinet-hmi", blk(-2450, 1135, 1250, 260, 12, 200).color('#20262b'));

// Inclined discharge belt running out under the box toward -Y.
const L = 4600, ANG = 12, TH = (ANG * Math.PI) / 180;
const onBelt = (s: Shape) => s.rotateX(-ANG).translate(0, 600, 380);
add("belt-frame", onBelt(blk(0, -L / 2, -180, 1240, L, 160).subtract(blk(0, -L / 2, -190, 1120, L + 20, 140))).color(frame));
add("belt", onBelt(blk(0, -L / 2, -20, 1100, L, 20)).color('#2b2e31'));
for (const s of [-1, 1]) add(`skirt-${s < 0 ? 'l' : 'r'}`, onBelt(blk(s * 580, -1300, -20, 30, 2600, 220)).color(hopper));
add("head-pulley", onBelt(cylinder(1180, 140, 12).rotateY(90).translate(-590, -L, -130)).color(cutters));
for (let i = 0; i < 26; i++) {
  const y = -200 - i * 165;
  const x = 380 * Math.sin(i * 2.3);
  const col = ['#8a6a45', '#5b7fa6', '#6c6f72', '#a83a32', '#c9b27c'][i % 5];
  add(`chunk-${i}`, onBelt(box(150 + 40 * (i % 3), 110, 70, true).rotateZ(i * 37).translate(x, y, 35)).color(col));
}
for (const yl of [2400, 3600, 4400]) {
  const y = 600 - yl * Math.cos(TH), z = 380 + yl * Math.sin(TH) - 200;
  for (const s of [-1, 1]) add(`belt-leg-${yl}-${s < 0 ? 'l' : 'r'}`, blk(s * 560, y, 0, 100, 100, z).color(frame));
}

return p.model();
