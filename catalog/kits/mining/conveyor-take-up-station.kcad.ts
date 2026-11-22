// SPDX-License-Identifier: CC0-1.0
// Conveyor gravity take-up, the tower under a long overland belt that keeps
// the belt tight as it stretches and as the load changes. What makes one:
// the return belt is led off its line over one bend pulley, down a steel
// tower, round a heavy take-up pulley and back up over a second bend
// pulley, and that take-up pulley rides in a carriage between vertical
// guide rails with a concrete counterweight box hung underneath, so gravity
// alone sets the belt tension. Around it: the tower frame and bracing, a
// grated head platform with handrails, a ladder, a yellow guard fence
// round the counterweight, and the belt continuing away both sides.
// The take-up travel choice moves the carriage up and down its rails.
// Millimetres, Z up, belt running along X, belt width across Y.
meta({
  name: "conveyor-take-up-station",
  license: 'CC0-1.0',
  title: "Conveyor take-up station",
  description: "Vertical gravity take-up tower for a 1200 mm conveyor at about real size: four-column braced steel tower, two bend pulleys on bearings at the top, return belt led down round a rubber-lagged take-up pulley and back up, take-up carriage with bearing blocks on two vertical guide rails, concrete counterweight box hung under the carriage, grated head platform with handrails and toe boards, access ladder, guard fence round the counterweight and the return belt continuing on idlers both sides. Take-up travel choice (high, mid, low) moves the carriage along its rails. Material controls: frame steel, pulley paint, belt rubber and counterweight concrete. weathered, mineGreen and highVisibility presets.",
  tags: ['mining', 'conveyor', 'belt conveyor', 'take-up', 'counterweight', 'pulley', 'materials handling'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const travel = param('travel', 'mid', { choices: ['high', 'mid', 'low'], label: 'Take-up travel (low = stretched belt)' });
const frameSteel = param('frameSteel', '#5e6a72', { label: 'Frame steel' });
const pulleyPaint = param('pulleyPaint', '#2f6f4a', { label: 'Pulley paint' });
const beltRubber = param('beltRubber', '#26292b', { label: 'Belt rubber' });
const counterweight = param('counterweight', '#a7a297', { label: 'Counterweight concrete' });
presets({
  weathered: { frameSteel: '#6a645c', pulleyPaint: '#5a5f52', beltRubber: '#33312e', counterweight: '#8f8a80' },
  mineGreen: { frameSteel: '#3f7a4a', pulleyPaint: '#d8a32a', beltRubber: '#222527', counterweight: '#b0aba0' },
  highVisibility: { frameSteel: '#e48a1e', pulleyPaint: '#2d3a45', beltRubber: '#26292b', counterweight: '#c4bfb3' },
});

const p = assembly("conveyor-take-up-station");
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
const blk = (x0, y0, z0, x1, y1, z1) => box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
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

const rail = '#e8c21e', shaft = '#9aa2a6';
const BW = 700; // half belt width plus edge
const RB = 300, XB = 800, ZB = 6200; // bend pulleys: radius, x offset, axis height
const RT = 500; // take-up pulley radius
const ZT = { high: 4800, mid: 4050, low: 3300 }[travel.value]; // take-up pulley axis height
const TX = 1400, TY = 1100; // tower column half spacing
const ZP = ZB + 600; // head platform

// A pulley across the belt with end discs, shaft and two bearing blocks.
const pulley = (name, r, x, z, carriageMounted) => {
  add(`${name}-drum`, latheY([[r, -BW], [r, BW]], x, z, 16).color(pulleyPaint));
  add(`${name}-lagging`, latheY([[r + 15, -BW + 60], [r + 15, BW - 60]], x, z, 16).color(beltRubber));
  for (const [k, s] of [-1, 1].entries()) add(`${name}-disc-${k}`, latheY([[r + 25, s > 0 ? BW - 30 : -BW], [r + 25, s > 0 ? BW : -BW + 30]], x, z, 16).color(pulleyPaint));
  add(`${name}-shaft`, latheY([[70, -BW - 400], [70, BW + 400]], x, z, 8).color(shaft));
  for (const [k, y] of [-BW - 260, BW + 260].entries()) add(`${name}-bearing-${k}`, blk(x - 180, y - 90, z - (carriageMounted ? 130 : 220), x + 180, y + 90, z + 130).color(pulleyPaint));
};

// ---- Tower frame ----
for (const [i, x] of [-TX, TX].entries()) {
  for (const [j, y] of [-TY, TY].entries()) {
    add(`column-${i}-${j}`, blk(x - 110, y - 110, 0, x + 110, y + 110, ZP).color(frameSteel));
    add(`base-plate-${i}-${j}`, blk(x - 220, y - 220, 0, x + 220, y + 220, 30).color(frameSteel));
  }
  for (const [j, z] of [1800, 4200].entries()) add(`tie-y-${i}-${j}`, blk(x - 80, -TY, z - 80, x + 80, TY, z + 80).color(frameSteel));
}
for (const [j, y] of [-TY, TY].entries()) {
  for (const [k, z] of [1800, 4200].entries()) add(`tie-x-${j}-${k}`, blk(-TX, y - 80, z - 80, TX, y + 80, z + 80).color(frameSteel));
  add(`brace-a-${j}`, tube([-TX, y, 1800], [TX, y, 4200], 45, 6).color(frameSteel));
  add(`brace-b-${j}`, tube([TX, y, 4200], [-TX, y, ZB - 300], 45, 6).color(frameSteel));
  add(`head-beam-${j}`, blk(-TX - 110, y - 120, ZB - 380, TX + 110, y + 120, ZB - 220).color(frameSteel));
}

// ---- Guide rails and carriage ----
const GY = BW + 470;
for (const [k, s] of [-1, 1].entries()) {
  add(`guide-rail-${k}`, blk(-90, s * GY - 60, 700, 90, s * GY + 60, ZB - 380).color(frameSteel));
  add(`guide-tie-${k}`, blk(-90, s * GY - 40, 2900, 90, s * TY, 3000).color(frameSteel));
  add(`carriage-plate-${k}`, blk(-420, s * (BW + 330) - 25, ZT - 600, 420, s * (BW + 330) + 25, ZT + 260).color(pulleyPaint));
  for (const [j, z] of [ZT - 520, ZT + 180].entries()) add(`guide-shoe-${k}-${j}`, blk(-140, s * GY - 100, z - 60, 140, s * GY + 100, z + 60).color(pulleyPaint));
}
add('carriage-crossbeam', blk(-200, -BW - 360, ZT - 760, 200, BW + 360, ZT - 600).color(pulleyPaint));
for (const [k, y] of [-500, 500].entries()) add(`hanger-${k}`, rod(30, ZT - 1300, ZT - 760, 8).translate(0, y, 0).color(shaft));
add('counterweight-box', blk(-800, -900, ZT - 2800, 800, 900, ZT - 1300).color(counterweight));
add('counterweight-frame', blk(-830, -930, ZT - 1380, 830, 930, ZT - 1300).color(frameSteel));
add('counterweight-lid', blk(-760, -860, ZT - 1300, 760, 860, ZT - 1270).color(frameSteel));

// ---- Pulleys and belt path ----
pulley('bend-pulley-in', RB, -XB, ZB, false);
pulley('bend-pulley-out', RB, XB, ZB, false);
pulley('take-up-pulley', RT, 0, ZT, true);
const BT = 18; // belt thickness
for (const [k, s] of [-1, 1].entries()) {
  // Vertical strands from the bend pulleys down to the take-up pulley.
  add(`belt-drop-${k}`, blk(s * RT, -BW + 50, ZT, s * RT + s * BT, BW - 50, ZB).color(beltRubber));
  // Return belt continuing away along the conveyor line.
  add(`belt-run-${k}`, blk(s * XB, -BW + 50, ZB + RB, s * 4300, BW - 50, ZB + RB + BT).color(beltRubber));
  for (const [j, x] of [2500, 4000].entries()) {
    add(`return-idler-${k}-${j}`, latheY([[70, -BW], [70, BW]], s * x, ZB + RB - 70, 10).color(pulleyPaint));
    add(`idler-stand-${k}-${j}`, blk(s * x - 70, -BW - 180, 0, s * x + 70, -BW - 60, ZB + RB - 70).color(frameSteel));
    add(`idler-stand-b-${k}-${j}`, blk(s * x - 70, BW + 60, 0, s * x + 70, BW + 180, ZB + RB - 70).color(frameSteel));
  }
}
// Belt wrap under the take-up pulley.
add('belt-wrap', latheY([[RT + 33, -BW + 50], [RT + 33, BW - 50]], 0, ZT, 16).subtract(latheY([[RT + 15, -BW], [RT + 15, BW]], 0, ZT, 16)).subtract(blk(-RT - 100, -BW, ZT, RT + 100, BW, ZT + RT + 100)).color(beltRubber));
// Quarter wraps over the bend pulleys: keep the top quadrant facing the tower centre.
for (const [k, s] of [-1, 1].entries()) {
  const c = s * XB, cut = s < 0 ? c - 500 : c;
  const shell = latheY([[RB + 33, -BW + 50], [RB + 33, BW - 50]], c, ZB, 16).subtract(latheY([[RB + 15, -BW], [RB + 15, BW]], c, ZB, 16));
  add(`belt-over-${k}`, shell.subtract(blk(cut, -BW, ZB - 400, cut + 500, BW, ZB + 400)).subtract(blk(c - 400, -BW, ZB - 400, c + 400, BW, ZB)).color(beltRubber));
}

// ---- Head platform, handrail and ladder ----
add('platform', blk(-TX - 300, -TY - 300, ZP, TX + 300, TY + 300, ZP + 50).subtract(blk(-XB - 450, -BW - 80, ZP - 10, XB + 450, BW + 80, ZP + 60)).color(frameSteel));
for (const [k, s] of [-1, 1].entries()) {
  for (const [j, z] of [ZP + 1100, ZP + 600].entries()) add(`rail-x-${k}-${j}`, cylX(22, -TX - 300, TX + 300, s * (TY + 300), z, 6).color(rail));
  for (const [j, x] of [-TX - 300, 0, TX + 300].entries()) add(`rail-post-${k}-${j}`, rod(24, ZP + 50, ZP + 1100, 6).translate(x, s * (TY + 300), 0).color(rail));
  add(`toe-board-${k}`, blk(-TX - 300, s * (TY + 300) - 8, ZP + 50, TX + 300, s * (TY + 300) + 8, ZP + 150).color(rail));
}
const LX = -TX - 300, LY = -TY + 400;
for (const [k, dy] of [-230, 230].entries()) add(`ladder-stile-${k}`, rod(28, 0, ZP + 1100, 6).translate(LX - 200, LY + dy, 0).color(rail));
for (let z = 300, i = 0; z < ZP; z += 300, i++) add(`ladder-rung-${i}`, tube([LX - 200, LY - 230, z], [LX - 200, LY + 230, z], 15, 4).color(rail));

// ---- Guard fence round the counterweight ----
const FX = TX + 500, FY = TY + 500;
for (const [k, [x, y]] of [[-FX, -FY], [FX, -FY], [FX, FY], [-FX, FY], [0, -FY], [0, FY]].entries()) add(`fence-post-${k}`, blk(x - 30, y - 30, 0, x + 30, y + 30, 1800).color(rail));
for (const [k, s] of [-1, 1].entries()) {
  for (const [j, z] of [900, 1800].entries()) add(`fence-rail-${k}-${j}`, blk(-FX, s * FY - 20, z - 40, FX, s * FY + 20, z).color(rail));
  for (let x = -FX + 250, i = 0; x < FX; x += 250, i++) add(`fence-bar-${k}-${i}`, blk(x - 10, s * FY - 10, 100, x + 10, s * FY + 10, 1760).color(rail));
}

return p.model();
