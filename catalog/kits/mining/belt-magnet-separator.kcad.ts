// SPDX-License-Identifier: CC0-1.0
// Overband belt magnet, the tramp-iron catcher hung over an ore conveyor
// ahead of a crusher. What makes it one: a heavy electromagnet or permanent
// magnet block suspended on four chains from a steel gantry a few hundred
// millimetres above a troughed belt, and wrapped in its own short cleated
// belt that runs ACROSS the conveyor between two pulleys. Bolts, drill steel
// and loader teeth jump up out of the ore, stick to the cleats and are
// carried sideways to drop down a chute into a scrap bin. The plate-magnet
// variant has no cleaning belt: a finned magnet box that a fitter scrapes by
// hand. Underneath runs a real troughed conveyor: three-roll idler sets,
// channel stringers on legs, a return belt, ore on the belt and a drive at
// the head pulley.
// Millimetres, Z up, conveyor along X with the head pulley towards +X.
meta({
  name: "belt-magnet-separator",
  license: 'CC0-1.0',
  title: "Overband belt magnet separator",
  description: "Cross-belt overband magnetic separator at about real size: a 1200 mm troughed ore conveyor (three-roll 35 degree idler sets, channel stringers, legs, return idlers and return belt, ore load, head pulley with motor and gearbox, discharge hood, tail pulley) under a four-column steel gantry, with the magnet hung on four chains. Self-cleaning version: magnet block inside a cleated cross belt on two pulleys with its own drive, terminal box, tramp-iron chute and scrap bin with caught steel. Plate-magnet version: finned suspended magnet box without a belt. Material controls: magnet paint, gantry and conveyor steel, belt rubber and ore, plus a magnet type choice. weathered, safetyOrange and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'overband magnet', 'tramp iron', 'belt conveyor', 'crusher protection'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const magnetPaint = param('magnetPaint', '#2f6db3', { label: 'Magnet paint' });
const structureSteel = param('structureSteel', '#d9a227', { label: 'Gantry and conveyor steel' });
const beltRubber = param('beltRubber', '#26292b', { label: 'Belt rubber' });
const ore = param('ore', '#7d6f5e', { label: 'Ore on the belt' });
const magnetType = param('magnetType', 'selfCleaning', { choices: ['selfCleaning', 'plateMagnet'], label: 'Magnet type' });
presets({
  weathered: { magnetPaint: '#4f6577', structureSteel: '#8a7c5e', beltRubber: '#3a3a38', ore: '#6d6458' },
  safetyOrange: { magnetPaint: '#e6761e', structureSteel: '#4b5459', beltRubber: '#222527', ore: '#8a7a66' },
  highVisibility: { magnetPaint: '#f0b81c', structureSteel: '#465159', beltRubber: '#24282a', ore: '#9a8a74' },
});

const p = assembly("belt-magnet-separator");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar along Y from y0 to y1, centred on (x, z).
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
// Round bar along X from x0 to x1, centred on (y, z).
const cylX = (r, x0, x1, y, z, n = 12) => rod(r, x0, x1, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// (y, z) outline extruded along X from x0 to x1.
const profileYZ = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const roll = '#8d9498', rust = '#7a4a2c', guard = '#e8c21e';
const selfCleaning = magnetType.value === 'selfCleaning';
const X0 = -3500, X1 = 3500;

// ---- Troughed conveyor ----
// Belt surface: 450 mm flat centre, 450 mm wings at 35 degrees.
add('carry-belt', profileYZ([[-594, 1308], [-225, 1050], [225, 1050], [594, 1308], [606, 1292], [229, 1030], [-229, 1030], [-606, 1292]], X0 + 200, X1 - 200).color(beltRubber));
add('ore-load', profileYZ([[-470, 1222], [-225, 1052], [225, 1052], [470, 1222], [280, 1320], [0, 1360], [-280, 1320]], X0 + 700, X1 - 200).color(ore));
for (const [k, s] of [-1, 1].entries()) {
  add(`stringer-${k}`, blk(X0 + 200, s * 700 - 40, 860, X1 - 200, s * 700 + 40, 1060).color(structureSteel));
}
for (let i = 0; i < 6; i++) {
  const x = X0 + 700 + i * 1150;
  add(`idler-base-${i}`, blk(x - 40, -700, 900, x + 40, 700, 940).color(structureSteel));
  add(`idler-centre-${i}`, cylY(60, -225, 225, x, 990, 8).color(roll));
  for (const [k, s] of [-1, 1].entries()) {
    add(`idler-wing-${i}-${k}`, tube([x, s * 240, 1000], [x, s * 600, 1252], 60, 8).color(roll));
    add(`idler-post-${i}-${k}`, blk(x - 30, s * 640 - 30, 940, x + 30, s * 640 + 30, 1240).color(structureSteel));
  }
}
add('return-belt', blk(X0 + 200, -600, 560, X1 - 200, 600, 580).color(beltRubber));
for (const [k, x] of [-2000, 0, 2000].entries()) {
  add(`return-idler-${k}`, cylY(55, -650, 650, x, 500, 8).color(roll));
}
for (const [k, x] of [-3000, -1000, 1000, 3000].entries()) {
  for (const [j, s] of [-1, 1].entries()) {
    add(`leg-${k}-${j}`, blk(x - 50, s * 700 - 50, 0, x + 50, s * 700 + 50, 860).color(structureSteel));
  }
  add(`leg-brace-${k}`, blk(x - 30, -700, 300, x + 30, 700, 360).color(structureSteel));
}
add('head-pulley', cylY(300, -650, 650, X1, 750, 14).color(beltRubber));
add('tail-pulley', cylY(240, -650, 650, X0, 810, 12).color(beltRubber));
add('head-gearbox', blk(X1 - 250, -1050, 550, X1 + 250, -720, 950).color(magnetPaint));
add('head-motor', cylY(200, -1550, -1050, X1, 750, 12).color(magnetPaint));
add('discharge-hood', blk(X1 + 320, -800, 200, X1 + 900, 800, 1400).color(structureSteel));
add('hood-roof', profileYZ([[-800, 1400], [800, 1400], [800, 1450], [-800, 1450]], X1 - 200, X1 + 900).color(structureSteel));

// ---- Gantry ----
const GX = 1150, GY = 1350, GZ = 3400;
for (const [k, [x, y]] of [[-GX, -GY], [GX, -GY], [-GX, GY], [GX, GY]].entries()) {
  add(`gantry-column-${k}`, blk(x - 100, y - 100, 0, x + 100, y + 100, GZ).color(structureSteel));
  add(`column-foot-${k}`, blk(x - 180, y - 180, 0, x + 180, y + 180, 30).color(structureSteel));
}
for (const [k, x] of [-GX, GX].entries()) add(`gantry-crossbeam-${k}`, blk(x - 110, -GY - 100, GZ, x + 110, GY + 100, GZ + 260).color(structureSteel));
for (const [k, y] of [-GY, GY].entries()) add(`gantry-runner-${k}`, blk(-GX - 100, y - 100, GZ + 260, GX + 100, y + 100, GZ + 460).color(structureSteel));
for (const [k, x] of [-GX, GX].entries()) {
  add(`knee-brace-${k}`, tube([x, -GY, GZ - 700], [x, -GY + 700, GZ], 40, 6).color(structureSteel));
}

// ---- Magnet ----
const ZB = 1750; // underside of the magnet, about 390 mm above the ore crest
if (selfCleaning) {
  const ZP = ZB + 220; // pulley centre
  for (const [k, y] of [-1050, 1050].entries()) add(`magnet-pulley-${k}`, cylX(220, -620, 620, y, ZP, 14).color(structureSteel));
  add('cleaning-belt-lower', blk(-640, -1050, ZB - 20, 640, 1050, ZB).color(beltRubber));
  add('cleaning-belt-upper', blk(-640, -1050, ZP + 220, 640, 1050, ZP + 240).color(beltRubber));
  for (let i = 0; i < 7; i++) {
    const y = -900 + i * 300;
    add(`cleat-lower-${i}`, blk(-640, y - 20, ZB - 70, 640, y + 20, ZB - 20).color(beltRubber));
    add(`cleat-upper-${i}`, blk(-640, y + 130, ZP + 240, 640, y + 170, ZP + 290).color(beltRubber));
  }
  add('magnet-block', blk(-560, -820, ZB + 30, 560, 820, ZP + 190).color(magnetPaint));
  for (const [k, s] of [-1, 1].entries()) {
    add(`side-frame-${k}`, blk(s * 690 - 30, -1150, ZB + 60, s * 690 + 30, 1150, ZP + 160).color(magnetPaint));
  }
  add('terminal-box', blk(-860, -300, ZB + 120, -720, 300, ZP + 100).color(magnetPaint));
  add('drive-gearbox', blk(720, 900, ZP - 200, 980, 1200, ZP + 200).color(structureSteel));
  add('drive-motor', cylX(170, 980, 1500, 1050, ZP, 12).color(magnetPaint));
  // Tramp-iron chute off the +Y end and the scrap bin below it.
  add('tramp-chute', profileYZ([[1200, ZP + 150], [1320, ZP + 150], [2050, 1150], [1930, 1100]], -560, 560).color(structureSteel));
  for (const [k, s] of [-1, 1].entries()) {
    add(`chute-cheek-${k}`, profileYZ([[1200, ZP + 150], [1320, ZP + 300], [2050, 1350], [1930, 1100]], s * 560, s * 560 + 30).color(structureSteel));
  }
  add('scrap-bin', blk(-700, 1700, 0, 700, 2600, 900).color(guard));
  add('scrap-steel-0', tube([-300, 1950, 920], [250, 2300, 1000], 30, 6).color(rust));
  add('scrap-steel-1', blk(-100, 2050, 900, 260, 2250, 980).color(rust));
  add('caught-bolt', tube([-300, -300, ZB - 100], [200, -150, ZB - 90], 22, 6).color(rust));
} else {
  // Suspended plate magnet: finned box, scraped clean by hand.
  add('magnet-block', blk(-650, -800, ZB, 650, 800, ZB + 380).color(magnetPaint));
  add('magnet-face', blk(-620, -770, ZB - 30, 620, 770, ZB).color('#c9ced0'));
  for (let i = 0; i < 9; i++) {
    const y = -720 + i * 180;
    add(`cooling-fin-${i}`, blk(-600, y - 15, ZB + 380, 600, y + 15, ZB + 560).color(magnetPaint));
  }
  add('terminal-box', blk(-820, -300, ZB + 80, -650, 300, ZB + 330).color(magnetPaint));
  add('caught-bolt', tube([-300, -300, ZB - 60], [200, -150, ZB - 50], 22, 6).color(rust));
}

// Four lifting lugs, chains up to the gantry runners.
const lugZ = selfCleaning ? ZB + 560 : ZB + 600;
for (const [k, [x, y]] of [[-560, -760], [560, -760], [-560, 760], [560, 760]].entries()) {
  add(`lifting-lug-${k}`, blk(x - 40, y - 40, lugZ - 140, x + 40, y + 40, lugZ).color(magnetPaint));
  add(`chain-${k}`, tube([x, y, lugZ], [Math.sign(x) * (GX - 200), Math.sign(y) * GY, GZ + 260], 22, 6).color('#5d6266'));
}

// ---- Control cabinet ----
add('control-cabinet', blk(-2600, 1400, 0, -1700, 1900, 1900).color(magnetPaint));
add('cabinet-plinth', blk(-2650, 1350, 0, -1650, 1950, 100).color(structureSteel));
add('cabinet-hood', blk(-2700, 1300, 1900, -1600, 2000, 1960).color(structureSteel));

return p.model();
