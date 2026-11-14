// SPDX-License-Identifier: CC0-1.0
// Glass crusher: the hammer-mill glass crusher that turns collected bottles
// and jars into cullet for remelting or aggregate. What makes it that
// machine rather than a plastics shredder: a cleated inclined belt lifting
// whole bottles from a low tipping hopper up into a drum-shaped hammer-mill
// housing; a direct-coupled motor on the end of the mill shaft; a short
// discharge chute dropping crushed cullet into a skip on the floor; all
// standing on an open steel stand.
// Generic visualization geometry at about real size (3.6 m wide, 5.4 m
// long, 3.3 m high), millimetres, Z up, infeed toward -Y.

meta({
  name: "glass-crusher",
  license: 'CC0-1.0',
  title: "Glass crusher",
  description: "Hammer-mill glass crusher at about real size: low tipping hopper and cleated inclined belt carrying whole bottles up into a drum-shaped mill housing on an open steel stand, separate direct-coupled motor with coupling guard, discharge chute into a floor skip heaped with cullet. Material controls: mill enamel, painted steel structure and motor casing, rubber belt, skip finish. plant, weathered, stainless and highVisibility presets; green, amber or clear (flint) glass.",
  tags: ["recycling", "glass crusher", "hammer mill", "cullet", "bottle crusher", "glass recycling", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const millEnamel = param('housing', '#2f6f8f', { label: 'Mill housing enamel' });
const frameSteel = param('stand', '#3b4248', { label: 'Painted steel frame, motor and conveyor structure' });
const beltRubber = param('belt', '#24272a', { label: 'Rubber belt and cleats' });
const skipPaint = param('skip', '#d8a428', { label: 'Cullet skip paint' });
const glass = param('glass', 'green', { choices: ['green', 'amber', 'flint'], label: 'Glass colour' });

presets({
  plant: { housing: '#2f6f8f', stand: '#3b4248', belt: '#24272a', skip: '#d8a428' },
  weathered: { housing: '#4e5f66', stand: '#4a4642', belt: '#2b2a28', skip: '#9a7f45' },
  stainless: { housing: '#c6cbcd', stand: '#7b858a', belt: '#24272a', skip: '#2f5d9a' },
  highVisibility: { housing: '#d9692a', stand: '#2f3438', belt: '#24272a', skip: '#f2d21b' },
});

const p = assembly("glass-crusher");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const glassColor = glass.value === 'amber' ? '#9a5a1e' : glass.value === 'flint' ? '#cfe3e6' : '#2f7a3e';

// Open steel stand under the mill.
const ZS = 1700; // stand top
for (const [x, y] of [[-850, -1050], [850, -1050], [-850, 1050], [850, 1050]]) add(`leg-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, y, 0, 140, 140, ZS).color(frameSteel));
for (const y of [-1050, 1050]) add(`brace-${y < 0 ? 'f' : 'b'}`, blk(0, y, 1300, 1600, 100, 100).color(frameSteel));
add("stand-top", blk(0, 0, ZS, 1840, 2240, 80).subtract(blk(0, 0, ZS - 10, 1600, 2000, 100)).color(frameSteel));
for (const y of [-450, 450]) add(`stand-beam-${y < 0 ? 'f' : 'b'}`, blk(0, y, ZS, 1700, 120, 80).color(frameSteel));

// Drum-shaped hammer-mill housing with bolted rings and an inlet throat.
const ZM = ZS + 80 + 520, RM = 560;
add("mill-drum", cylinder(900, RM, 18).rotateY(90).translate(-450, 0, ZM).color(millEnamel));
for (const x of [-470, 450]) add(`drum-ring-${x < 0 ? 'l' : 'r'}`, cylinder(20, RM + 40, 18).rotateY(90).translate(x, 0, ZM).color(frameSteel));
add("mill-base", blk(0, 0, ZS + 80, 900, 900, 520).color(millEnamel));
add("inlet-throat", profileYZ([[-760, ZM + 220], [-160, ZM + 420], [-160, ZM + 680], [-760, ZM + 680]], 700).color(millEnamel));
for (let i = 0; i < 6; i++) add(`curtain-${i}`, blk(-275 + i * 110, -780, ZM + 360, 100, 10, 300).color(beltRubber));
add("bearing-l", blk(-560, 0, ZM - 160, 100, 300, 260).color(frameSteel));
add("bearing-r", blk(560, 0, ZM - 160, 100, 300, 260).color(frameSteel));
add("shaft", cylinder(1700, 70, 10).rotateY(90).translate(-850, 0, ZM).color('#c3c9cc'));

// Direct-coupled motor on the +X end, on a bracket off the stand.
add("motor-bracket", blk(1100, 0, ZS, 700, 700, 80).color(frameSteel));
for (const y of [-300, 300]) add(`bracket-strut-${y < 0 ? 'f' : 'b'}`, blk(1420, y, 0, 100, 100, ZS).color(frameSteel));
add("coupling-guard", cylinder(220, 180, 12).rotateY(90).translate(620, 0, ZM).color('#f0ae32'));
// Keep the separate electric motor casing on the painted-steel finish rather than the mill enamel.
add("motor", cylinder(800, 300, 14).rotateY(90).translate(840, 0, ZM).color(frameSteel));
add("motor-cowl", cylinder(80, 310, 14).rotateY(90).translate(1640, 0, ZM).color('#20262b'));
add("motor-feet", blk(1240, 0, ZS + 80, 700, 500, ZM - ZS - 380).color(frameSteel));
add("terminal-box", blk(1150, -260, ZM + 220, 220, 180, 180).color('#20262b'));

// Discharge chute into a floor skip of cullet.
add("discharge-chute", profileYZ([[-300, ZS + 20], [300, ZS + 20], [200, 1250], [-200, 1250]], 500).subtract(profileYZ([[-260, ZS + 40], [260, ZS + 40], [160, 1230], [-160, 1230]], 460)).color(millEnamel));
const skipOut: [number, number][] = [[-700, 0], [700, 0], [950, 1050], [-950, 1050]];
const skipIn: [number, number][] = [[-640, 70], [640, 70], [880, 1080], [-880, 1080]];
add("skip", profileYZ(skipOut, 1300).subtract(profileYZ(skipIn, 1200)).color(skipPaint));
add("skip-rim", blk(0, 0, 1020, 1340, 1940, 40).subtract(blk(0, 0, 1010, 1200, 1760, 60)).color(skipPaint));
for (const s of [-1, 1]) add(`skip-lug-${s < 0 ? 'l' : 'r'}`, cylinder(120, 80, 10).rotateY(90).translate(s < 0 ? -770 : 650, 0, 820).color(frameSteel));
add("cullet-heap", sphere(700).scale([0.9, 1.2, 0.42]).translate(0, 50, 900).subtract(blk(0, 0, 0, 3000, 3000, 980)).color(glassColor));
for (let i = 0; i < 14; i++) add(`cullet-${i}`, box(60, 40, 18, true).rotateZ(i * 41).rotateX(25).translate(-520 + i * 80, -700 + 60 * Math.sin(i * 2.1), 1110).color(glassColor));

// Low tipping hopper and cleated inclined belt rising into the throat.
const L = 4200, ANG = 22, TH = (ANG * Math.PI) / 180;
const Y0 = -700, Z0 = ZM + 440; // belt head at the throat
const onBelt = (s: Shape) => s.rotateX(ANG).translate(0, Y0, Z0); // local y runs from 0 down to -L
add("belt-frame", onBelt(blk(0, -L / 2, -200, 760, L, 170).subtract(blk(0, -L / 2, -210, 640, L + 20, 150))).color(frameSteel));
add("belt", onBelt(blk(0, -L / 2, -30, 620, L, 30)).color(beltRubber));
for (const s of [-1, 1]) add(`belt-side-${s < 0 ? 'l' : 'r'}`, onBelt(blk(s * 360, -L / 2 - 200, -30, 30, L - 400, 200)).color(frameSteel));
for (let i = 0; i < 12; i++) add(`cleat-${i}`, onBelt(blk(0, -300 - i * 320, 0, 600, 20, 70)).color(beltRubber));
add("head-pulley", onBelt(cylinder(700, 130, 12).rotateY(90).translate(-350, -40, -130)).color('#c3c9cc'));
const yEnd = Y0 - L * Math.cos(TH), zEnd = Z0 - L * Math.sin(TH);
add("tipping-hopper", profileYZ([[-500, zEnd - 230], [400, zEnd - 230], [550, zEnd + 400], [-750, zEnd + 400]], 1000).subtract(profileYZ([[-440, zEnd - 170], [340, zEnd - 170], [490, zEnd + 430], [-690, zEnd + 430]], 920)).translate(0, yEnd + 200, 0).color(millEnamel));
for (const [yl, s] of [[1600, -1], [1600, 1], [3000, -1], [3000, 1]] as [number, number][]) {
  const y = Y0 - yl * Math.cos(TH), z = Z0 - yl * Math.sin(TH) - 220;
  add(`belt-leg-${yl}-${s < 0 ? 'l' : 'r'}`, blk(s * 330, y, 0, 90, 90, z).color(frameSteel));
}
// Whole bottles riding up between the cleats.
for (let i = 0; i < 9; i++) {
  const yl = -480 - i * 320 - 60, x = 160 * Math.sin(i * 2.4);
  const b = cylinder(240, 40, 8).union(cylinder(90, 16, 6).translate(0, 0, 240)).rotateX(90).translate(x, yl + 120, 45);
  add(`bottle-${i}`, onBelt(b).color(i % 3 === 1 ? '#9a5a1e' : glassColor));
}
for (const [x, y] of [[-420, -420], [420, -420], [-420, 320], [420, 320]]) add(`hopper-leg-${x < 0 ? 'l' : 'r'}-${y < 0 ? 'f' : 'b'}`, blk(x, yEnd + 200 + y, 0, 90, 90, zEnd - 230).color(frameSteel));

return p.model();
