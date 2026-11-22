// SPDX-License-Identifier: CC0-1.0
// Flotation conditioning tank, the agitated tank in front of a flotation
// bank where the mill slurry soaks in collector and frother before it meets
// air. What makes it one: an open-topped steel cylinder brim full of grey
// slurry, a bridge of two beams across the rim carrying the walkway and the
// agitator drive, a vertical motor on a right-angle gearbox, a shaft going
// down into the slurry, four wall baffles that stop the slurry swirling, a
// feed pipe dropping in over the rim, thin reagent lines, and an overflow
// box on the far side that sends the conditioned slurry on to the cells.
// The flat-bottomed version stands on a concrete ring plinth; the elevated
// version has a cone bottom with a drain valve on four braced legs.
// Millimetres, Z up, tank axis on the origin, overflow towards +X.
meta({
  name: "flotation-conditioning-tank",
  license: 'CC0-1.0',
  title: "Flotation conditioning tank",
  description: "Agitated flotation conditioning tank at about real size: 3.5 m open-topped steel tank with stiffener rings, slurry surface and four wall baffles, bridge beams with grated walkway and handrails, vertical agitator motor with fan cowl on a gearbox, agitator shaft, feed pipe over the rim, yellow reagent dosing lines, overflow box with discharge pipe, and a caged access ladder. Support choice: flat bottom on a concrete ring plinth, or cone bottom with drain valve on four braced legs. Material controls: tank paint, walkway steel, drive paint and slurry. weathered, processBlue and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'flotation', 'conditioning tank', 'agitator', 'slurry', 'reagents'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tankPaint = param('tankPaint', '#4f8a6a', { label: 'Tank paint' });
const walkwaySteel = param('walkwaySteel', '#8b9497', { label: 'Walkway steel (galvanised)' });
const drivePaint = param('drivePaint', '#2f5f8f', { label: 'Drive paint' });
const slurry = param('slurry', '#6f6c62', { label: 'Slurry' });
const support = param('support', 'plinth', { choices: ['plinth', 'legs'], label: 'Support' });
presets({
  weathered: { tankPaint: '#5d6b60', walkwaySteel: '#767a76', drivePaint: '#4c5e70', slurry: '#5f5a4e' },
  processBlue: { tankPaint: '#3a6f9e', walkwaySteel: '#9aa3a6', drivePaint: '#d8d4c8', slurry: '#77746a' },
  highVisibility: { tankPaint: '#e48a1e', walkwaySteel: '#8b9497', drivePaint: '#2d3a45', slurry: '#6f6c62' },
});

const p = assembly("flotation-conditioning-tank");
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
const ring = (ro, ri, z0, z1, n = 24) => rod(ro, z0, z1, n).subtract(rod(ri, z0 - 10, z1 + 10, n));
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
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

const rail = '#e8c21e', concrete = '#a39e94', reagent = '#e0b52a', dark = '#24282a', shaftSteel = '#a9b0b3';
const legs = support.value === 'legs';
const R = 1750; // tank radius
const Z0 = legs ? 1800 : 300; // underside of the cylindrical wall
const ZT = Z0 + 3600; // rim
const ZS = ZT - 350; // slurry surface
const ZB = ZT + 300; // walkway deck

// ---- Tank shell, slurry and baffles ----
const outline = legs ? [[220, 900], [R, Z0], [R, ZT]] : [[R, Z0], [R, ZT]];
add('tank-shell', lathe(outline, 24).subtract(rod(R - 30, Z0 + 100, ZT + 10, 24)).color(tankPaint));
add('slurry', rod(R - 32, Z0 + 100, ZS, 24).color(slurry));
add('rim-angle', ring(R + 70, R - 30, ZT - 80, ZT, 24).color(tankPaint));
for (const [k, z] of [Z0 + 1000, Z0 + 2200].entries()) add(`stiffener-ring-${k}`, ring(R + 50, R - 10, z, z + 90, 24).color(tankPaint));
for (let i = 0; i < 4; i++) add(`baffle-${i}`, blk(R - 210, -45, Z0 + 300, R - 30, 45, ZT - 120).rotateZ(45 + i * 90).color(tankPaint));

if (legs) {
  add('drain-pipe', rod(110, 450, 900, 10).color(walkwaySteel));
  add('drain-valve', blk(-170, -170, 300, 170, 170, 450).color(drivePaint));
  add('valve-wheel', torus(120, 18, 10).rotateX(90).translate(0, -230, 375).color(dark));
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 4) + (i * Math.PI) / 2;
    const x = (R - 150) * Math.cos(a), y = (R - 150) * Math.sin(a);
    add(`leg-${i}`, blk(x - 120, y - 120, 0, x + 120, y + 120, Z0 + 400).color(tankPaint));
    add(`leg-foot-${i}`, blk(x - 220, y - 220, 0, x + 220, y + 220, 40).color(walkwaySteel));
    const b = (Math.PI / 4) + ((i + 1) * Math.PI) / 2;
    const x2 = (R - 150) * Math.cos(b), y2 = (R - 150) * Math.sin(b);
    add(`brace-${i}`, tube([x, y, 300], [x2, y2, Z0 - 200], 40, 6).color(walkwaySteel));
  }
} else {
  add('plinth', ring(R + 200, R - 400, 0, Z0, 24).color(concrete));
  add('plinth-core', rod(R - 400, 0, Z0 - 40, 16).color(concrete));
}

// ---- Bridge beams, walkway and handrail ----
for (const [k, y] of [-420, 420].entries()) add(`bridge-beam-${k}`, blk(-R - 250, y - 110, ZT, R + 250, y + 110, ZB).color(walkwaySteel));
add('walkway-deck-a', blk(-R - 250, -540, ZB, -480, 540, ZB + 40).color(walkwaySteel));
add('walkway-deck-b', blk(480, -540, ZB, R + 250, 540, ZB + 40).color(walkwaySteel));
for (const [k, y] of [-560, 560].entries()) {
  for (const [j, x] of [-R - 230, -R / 2, R / 2, R + 230].entries()) add(`rail-post-${k}-${j}`, rod(24, ZB + 40, ZB + 1100, 6).translate(x, y, 0).color(rail));
  for (const [j, z] of [ZB + 1100, ZB + 600].entries()) add(`rail-${k}-${j}`, cylX(22, -R - 230, R + 230, y, z, 6).color(rail));
  add(`toe-board-${k}`, blk(-R - 230, y - 8, ZB + 40, R + 230, y + 8, ZB + 140).color(rail));
}

// ---- Agitator drive ----
add('drive-plate', blk(-480, -540, ZB, 480, 540, ZB + 60).color(walkwaySteel));
add('gearbox', blk(-420, -360, ZB + 60, 420, 360, ZB + 560).color(drivePaint));
add('gearbox-input', cylX(170, 420, 640, 0, ZB + 380, 10).color(drivePaint));
add('motor-flange', rod(330, ZB + 560, ZB + 620, 14).color(drivePaint));
add('motor', rod(300, ZB + 620, ZB + 1350, 14).color(drivePaint));
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  add(`motor-fin-${i}`, blk(-18, -18, ZB + 680, 18, 18, ZB + 1300).translate(318 * Math.cos(a), 318 * Math.sin(a), 0).color(drivePaint));
}
add('fan-cowl', lathe([[310, ZB + 1350], [290, ZB + 1520], [110, ZB + 1570]], 14).color(walkwaySteel));
add('terminal-box', blk(-160, -480, ZB + 850, 160, -300, ZB + 1080).color(drivePaint));
add('agitator-shaft', rod(70, Z0 + 500, ZB, 10).color(shaftSteel));
add('shaft-collar', rod(130, ZS + 120, ZS + 260, 10).color(shaftSteel));

// ---- Feed pipe, reagent lines, overflow and ladder ----
add('feed-pipe', cylX(140, -R - 1600, -R + 500, -900, ZT + 300, 12).color(walkwaySteel));
add('feed-elbow', blk(-R + 360, -1040, ZT + 140, -R + 640, -760, ZT + 460).color(walkwaySteel));
add('feed-downcomer', rod(140, ZS - 600, ZT + 140, 12).translate(-R + 500, -900, 0).color(walkwaySteel));
add('feed-support', blk(-R - 1500, -980, 0, -R - 1340, -820, ZT + 160).color(walkwaySteel));
// Reagent header clipped along the walkway handrail, with drop lines to the slurry.
for (const [k, y] of [620, 700].entries()) {
  add(`reagent-line-${k}`, cylX(16, -R - 230, -R + 300 + k * 250, y, ZB + 900 + k * 60, 6).color(reagent));
  add(`reagent-drop-${k}`, rod(16, ZS + 150, ZB + 900 + k * 60, 6).translate(-R + 300 + k * 250, y, 0).color(reagent));
}
add('overflow-box', blk(R - 20, -400, ZT - 900, R + 550, 400, ZT - 200).color(tankPaint));
add('overflow-pipe', cylX(200, R + 550, R + 1500, 0, ZT - 550, 12).color(tankPaint));
add('overflow-drop', rod(200, 0, ZT - 550, 12).translate(R + 1500, 0, 0).color(tankPaint));
const LX = R + 260, LY = 900;
for (const [k, dy] of [-230, 230].entries()) add(`ladder-stile-${k}`, rod(28, 0, ZB + 1100, 6).translate(LX, LY + dy, 0).color(rail));
for (let z = 300, i = 0; z < ZB; z += 300, i++) add(`ladder-rung-${i}`, tube([LX, LY - 230, z], [LX, LY + 230, z], 15, 4).color(rail));
for (const [k, z] of [ZB - 1800, ZB - 900, ZB].entries()) {
  if (z > 2300) add(`cage-hoop-${k}`, torus(380, 18, 12).translate(LX + 380, LY, z).color(rail));
}
add('ladder-landing', blk(LX - 120, 540, ZB, LX + 300, LY + 300, ZB + 40).color(walkwaySteel));

return p.model();
