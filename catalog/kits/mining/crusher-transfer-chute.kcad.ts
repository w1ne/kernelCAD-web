// SPDX-License-Identifier: CC0-1.0
// Crusher transfer chute, the steel chute where crushed ore leaves one
// conveyor and drops onto the next. What makes one: the upper conveyor's
// head pulley sits inside a curved head hood, the ore is thrown off the
// belt into the hood and falls down a tapering chute body that narrows the
// stream onto the centre of the receiving belt below, between skirt
// boards. The impact faces carry bolted replaceable wear liners, the hood
// has hinged inspection doors, and a dust extraction duct leaves from the
// top. Around it: a four-column head tower with bracing, a grated access
// platform with handrails and a ladder, the head drive on the upper
// conveyor, and the loaded receiving belt.
// The layout choice runs the receiving belt at a right angle or in line
// with the upper conveyor; the door choice opens the inspection doors.
// Millimetres, Z up, upper conveyor arriving along +X.
meta({
  name: "crusher-transfer-chute",
  license: 'CC0-1.0',
  title: "Crusher transfer chute",
  description: "Conveyor-to-conveyor transfer chute at about real size: upper 1200 mm troughed conveyor with head pulley, gearbox and motor discharging into a curved head hood; tapering lofted chute body with flanged joints and bolted wear liner panels; spoon and skirt boards onto a loaded receiving conveyor below; two hinged inspection doors; dust extraction duct; four-column head tower with bracing; grated access platform with handrails and ladder. Layout choice (rightAngle, inline) turns the receiving belt; door choice (closed, open). Material controls: chute paint, frame steel, belt rubber and wear liner. weathered, plantGreen and highVisibility presets.",
  tags: ['mining', 'conveyor', 'transfer chute', 'crusher', 'wear liner', 'materials handling', 'mineral processing'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const layout = param('layout', 'rightAngle', { choices: ['rightAngle', 'inline'], label: 'Receiving belt layout' });
const doors = param('doors', 'closed', { choices: ['closed', 'open'], label: 'Inspection doors' });
const chutePaint = param('chutePaint', '#c8642a', { label: 'Chute paint' });
const frameSteel = param('frameSteel', '#56626a', { label: 'Frame steel' });
const beltRubber = param('beltRubber', '#25282a', { label: 'Belt rubber' });
const wearLiner = param('wearLiner', '#d8d3c4', { label: 'Wear liner' });
presets({
  weathered: { chutePaint: '#8d6a4f', frameSteel: '#66625b', beltRubber: '#34322f', wearLiner: '#8c8576' },
  plantGreen: { chutePaint: '#2f6f4a', frameSteel: '#4a545b', beltRubber: '#222527', wearLiner: '#c94a3a' },
  highVisibility: { chutePaint: '#e48a1e', frameSteel: '#2d3a45', beltRubber: '#26292b', wearLiner: '#f0eee6' },
});

const p = assembly("crusher-transfer-chute");
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
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Closed (y, z) outline extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};
// Closed (x, z) outline extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
const rect = (x0, x1, y0, y1) => path().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).close();
const taper = (lo, hi, z0, z1) => rect(...lo).loft([rect(...hi)], {
  planes: [{ plane: 'XY', origin: [0, 0, z0] }, { plane: 'XY', origin: [0, 0, z1] }],
  ruled: true,
});

const rail = '#e8c21e', shaft = '#9aa2a6', motorBlue = '#3d6f9a', ore = '#7a6552';
const BW = 600, SY = BW + 230; // half belt width, stringer centre line
const ZU = 6600; // upper belt line
const ZL = 1500; // receiving belt line
const RP = 320; // head pulley radius
const ZH = ZU - RP - 60; // head pulley axis
const trough = [[-BW, 190], [-200, -65], [200, -65], [BW, 190], [BW, 208], [200, -47], [-200, -47], [-BW, 208]];
const lift = (pts, z) => pts.map(([y, v]) => [y, v + z]);

// ---- Upper conveyor arriving from -X ----
add('upper-belt', prismX(lift(trough, ZU), -7000, -500).color(beltRubber));
add('upper-ore', prismX(lift([[-430, 70], [-200, -47], [200, -47], [430, 70], [260, 190], [0, 250], [-260, 190]], ZU), -7000, -600).color(ore));
add('upper-return-belt', blk(-7000, -BW + 40, ZU - 2 * RP - 80, 0, BW - 40, ZU - 2 * RP - 62).color(beltRubber));
for (const [k, s] of [-1, 1].entries()) add(`upper-stringer-${k}`, blk(-7000, s * SY - 90, ZU - 560, 300, s * SY + 90, ZU - 300).color(frameSteel));
for (let x = -6200, i = 0; x <= -1300; x += 1300, i++) {
  add(`upper-idler-${i}`, latheY([[65, -195], [65, 195]], x, ZU - 130, 10).color(chutePaint));
  for (const [k, s] of [-1, 1].entries()) add(`upper-idler-wing-${i}-${k}`, tube([x, s * 215, ZU - 130], [x, s * 560, ZU + 115], 65, 10).color(chutePaint));
  add(`upper-idler-frame-${i}`, blk(x - 45, -SY, ZU - 330, x + 45, SY, ZU - 260).color(frameSteel));
}
add('head-shaft', latheY([[70, -SY - 250], [70, SY + 250]], 0, ZH, 8).color(shaft));
for (const [k, s] of [-1, 1].entries()) add(`head-bearing-${k}`, blk(-180, s * (SY + 120) - 80, ZH - 150, 180, s * (SY + 120) + 80, ZH + 130).color(chutePaint));
add('head-gearbox', blk(-300, -SY - 680, ZH - 380, 300, -SY - 270, ZH + 300).color(chutePaint));
add('head-motor', latheX([[240, -1500], [240, -500]], -SY - 470, ZH - 60, 12).color(motorBlue));
add('head-coupling-guard', blk(-520, -SY - 640, ZH - 230, -300, -SY - 300, ZH + 110).color(rail));

// ---- Head hood and chute body ----
add('head-hood', prismY([[-900, 5000], [1500, 5000], [1500, 6900], [900, 7350], [-400, 7350], [-900, 7000]], -900, 900).color(chutePaint));
add('hood-flange', blk(-960, -960, 4950, 1560, 960, 5050).color(frameSteel));
add('chute-body', taper([-500, 700, -650, 650], [-900, 1500, -900, 900], 2600, 4950).color(chutePaint));
add('chute-flange', blk(-560, -710, 2560, 760, 710, 2640).color(frameSteel));
add('spoon', taper([-380, 580, -470, 470], [-500, 700, -650, 650], 1950, 2560).color(chutePaint));
add('spoon-liner-lip', blk(-400, -490, 1880, 600, 490, 1960).color(wearLiner));
// Bolted wear liner panels on the hood impact face and side.
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 2; j++) {
    const y0 = -820 + i * 560, z0 = 5150 + j * 820;
    add(`liner-panel-${i}-${j}`, blk(1500, y0, z0, 1525, y0 + 520, z0 + 760).color(wearLiner));
    for (const [m, [dy, dz]] of [[110, 120], [410, 120], [110, 640], [410, 640]].entries()) add(`liner-bolt-${i}-${j}-${m}`, blk(1525, y0 + dy - 25, z0 + dz - 25, 1550, y0 + dy + 25, z0 + dz + 25).color(frameSteel));
  }
}

// ---- Inspection doors on the -Y face of the hood ----
for (const [k, [x0, z0]] of [[-650, 5200], [500, 5200]].entries()) {
  const w = 700, h = 900;
  add(`door-frame-${k}`, blk(x0 - 60, -930, z0 - 60, x0 + w + 60, -900, z0 + h + 60).color(frameSteel));
  const leaf = blk(0, -30, 0, w, 0, h).union(blk(w - 160, -80, h / 2 - 25, w - 60, -30, h / 2 + 25));
  const placed = doors.value === 'open' ? leaf.rotateZ(105) : leaf;
  add(`door-${k}`, placed.translate(x0, -930, z0).color(chutePaint));
  add(`door-hinge-${k}`, rod(30, z0 + 40, z0 + h - 40, 8).translate(x0, -945, 0).color(shaft));
}

// ---- Dust extraction duct ----
add('duct-riser', rod(300, 7350, 8700, 14).translate(300, 0, 0).color(chutePaint));
add('duct-elbow', latheY([[330, -330], [330, 330]], 300, 8700, 14).color(chutePaint));
add('duct-run', latheY([[300, 330], [300, 3800]], 300, 8700, 14).color(chutePaint));
for (const [k, y] of [330, 2000, 3800].entries()) add(`duct-flange-${k}`, latheY([[350, y - 25], [350, y + 25]], 300, 8700, 14).color(frameSteel));

// ---- Receiving conveyor: drawn along X, turned for the right-angle layout ----
const turn = (s) => (layout.value === 'rightAngle' ? s.rotateZ(90) : s);
const LX0 = -2800, LX1 = 5200;
add('lower-belt', turn(prismX(lift(trough, ZL), LX0, LX1)).color(beltRubber));
add('lower-ore', turn(prismX(lift([[-430, 70], [-200, -47], [200, -47], [430, 70], [260, 190], [0, 250], [-260, 190]], ZL), 100, LX1)).color(ore));
add('lower-return-belt', turn(blk(LX0, -BW + 40, ZL - 2 * RP - 80, LX1, BW - 40, ZL - 2 * RP - 62)).color(beltRubber));
for (const [k, s] of [-1, 1].entries()) {
  add(`lower-stringer-${k}`, turn(blk(LX0, s * SY - 90, ZL - 560, LX1, s * SY + 90, ZL - 300)).color(frameSteel));
  add(`skirt-board-${k}`, turn(blk(-700, s * 470 - 12, ZL + 60, 2600, s * 470 + 12, ZL + 520)).color(chutePaint));
  add(`skirt-rubber-${k}`, turn(blk(-700, s * 455 - 8, ZL - 20, 2600, s * 455 + 8, ZL + 80)).color(beltRubber));
}
for (let x = -2200, i = 0; x <= 4800; x += x < 2600 ? 600 : 1200, i++) {
  add(`lower-idler-${i}`, turn(latheY([[65, -195], [65, 195]], x, ZL - 130, 10)).color(chutePaint));
  for (const [k, s] of [-1, 1].entries()) add(`lower-idler-wing-${i}-${k}`, turn(tube([x, s * 215, ZL - 130], [x, s * 560, ZL + 115], 65, 10)).color(chutePaint));
  add(`lower-idler-frame-${i}`, turn(blk(x - 45, -SY, ZL - 330, x + 45, SY, ZL - 260)).color(frameSteel));
}
for (const [i, x] of [-2600, 3800].entries()) {
  for (const [k, s] of [-1, 1].entries()) add(`lower-leg-${i}-${k}`, turn(blk(x - 80, s * SY - 80, 0, x + 80, s * SY + 80, ZL - 560)).color(frameSteel));
}

// ---- Head tower ----
const TX = 2000, TY = 1800, ZP = 4800;
for (const [i, x] of [-TX, TX].entries()) {
  for (const [j, y] of [-TY, TY].entries()) {
    add(`column-${i}-${j}`, blk(x - 110, y - 110, 0, x + 110, y + 110, ZU - 560).color(frameSteel));
    add(`base-plate-${i}-${j}`, blk(x - 230, y - 230, 0, x + 230, y + 230, 30).color(frameSteel));
  }
  add(`tower-tie-y-${i}`, blk(x - 90, -TY, ZU - 700, x + 90, TY, ZU - 560).color(frameSteel));
  add(`tower-brace-${i}`, tube([x, -TY, 2400], [x, TY, ZP], 45, 6).color(frameSteel));
}
for (const [j, y] of [-TY, TY].entries()) {
  add(`tower-tie-x-${j}`, blk(-TX, y - 90, ZU - 700, TX, y + 90, ZU - 560).color(frameSteel));
  add(`tower-brace-x-${j}`, tube([-TX, y, 2400], [TX, y, ZP], 45, 6).color(frameSteel));
}
add('platform', blk(-TX - 300, -TY - 300, ZP, TX + 300, TY + 300, ZP + 50).subtract(blk(-1000, -1000, ZP - 10, 1600, 1000, ZP + 60)).color(frameSteel));
for (const [k, s] of [-1, 1].entries()) {
  for (const [j, z] of [ZP + 1100, ZP + 600].entries()) {
    add(`rail-x-${k}-${j}`, tube([-TX - 300, s * (TY + 300), z], [TX + 300, s * (TY + 300), z], 22, 6).color(rail));
    add(`rail-y-${k}-${j}`, tube([s * (TX + 300), -TY - 300, z], [s * (TX + 300), TY + 300, z], 22, 6).color(rail));
  }
  for (const [j, x] of [-TX - 300, 0, TX + 300].entries()) add(`rail-post-${k}-${j}`, rod(24, ZP + 50, ZP + 1100, 6).translate(x, s * (TY + 300), 0).color(rail));
}
const LXL = TX + 300, LYL = -1400;
for (const [k, dy] of [-230, 230].entries()) add(`ladder-stile-${k}`, rod(28, 0, ZP + 1100, 6).translate(LXL + 200, LYL + dy, 0).color(rail));
for (let z = 300, i = 0; z < ZP; z += 300, i++) add(`ladder-rung-${i}`, tube([LXL + 200, LYL - 230, z], [LXL + 200, LYL + 230, z], 15, 4).color(rail));

return p.model();
