// SPDX-License-Identifier: CC0-1.0
// SAG mill feed chute, the steel chute that takes ore off the end of the
// mill feed conveyor and drops it into the mouth of a grinding mill. What
// makes one: a head hood wrapped round the conveyor head pulley, a long
// sloped trough lined with replaceable rubber wear liners carrying a
// stream of ore, a drop box with inspection doors, and a feed spout that
// pushes into the hollow trunnion at the end of the mill. Because the
// spout must come out whenever the mill is relined, it sits on a wheeled
// trolley on rails: in service it is pushed into the trunnion, retracted
// it is rolled back clear. Process water joins the ore at the spout.
// Millimetres, Z up, ore flowing towards +X, mill axis along X.
meta({
  name: "mill-feed-chute",
  license: 'CC0-1.0',
  title: "Mill feed chute",
  description: "SAG mill feed chute at about real size: mill feed conveyor end with belt, ore load, troughed idlers, stringers and head pulley inside a head hood, sloped open trough with rubber wear liners and an ore stream, drop box with inspection doors and handles, feed spout on a wheeled trolley on rails entering the mill trunnion, process water pipe to the spout, support columns and an access platform with handrail. The mill feed end is shown for context: trunnion, bearing pedestal, feed-end cone and shell. Spout choice: in service (pushed into the trunnion) or retracted for relining. Material controls: chute paint, wear liner rubber, mill shell and ore. weathered, mineGreen and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'grinding', 'SAG mill', 'feed chute', 'wear liner', 'conveyor'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chutePaint = param('chutePaint', '#5b7f98', { label: 'Chute paint' });
const wearLiner = param('wearLiner', '#2b2d2e', { label: 'Wear liner rubber' });
const millShell = param('millShell', '#d0a128', { label: 'Mill shell' });
const ore = param('ore', '#7a6650', { label: 'Ore' });
const spout = param('spout', 'inService', { choices: ['inService', 'retracted'], label: 'Feed spout' });
presets({
  weathered: { chutePaint: '#6a6e6a', wearLiner: '#34312d', millShell: '#9a7f45', ore: '#6a5a48' },
  mineGreen: { chutePaint: '#3f7a4a', wearLiner: '#262829', millShell: '#c9c6bc', ore: '#7d7466' },
  highVisibility: { chutePaint: '#e48a1e', wearLiner: '#2b2d2e', millShell: '#2f5f8f', ore: '#8a6a4c' },
});

const p = assembly("mill-feed-chute");
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
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
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

const steel = '#4d555b', rail = '#e8c21e', water = '#2f6fb0', dark = '#1b1e20';
const out = spout.value === 'retracted';
const ZM = 3200; // mill axis height
const XT = 3000; // trunnion mouth
const ZC = 8000; // conveyor belt level at the head pulley
const XH = -4200; // head pulley axis
const BW = 600; // half belt width

// ---- Mill feed end (context) ----
add('trunnion', latheX([[650, XT], [650, XT + 700]], 0, ZM, 18).subtract(latheX([[480, XT - 10], [480, XT + 720]], 0, ZM, 18)).color(millShell));
add('trunnion-mouth', latheX([[480, XT + 400], [480, XT + 420]], 0, ZM, 18).color(dark));
add('feed-head', latheX([[750, XT + 700], [2900, XT + 1500]], 0, ZM, 18).color(millShell));
add('mill-shell', latheX([[2900, XT + 1500], [2900, XT + 3000]], 0, ZM, 18).color(millShell));
for (const [k, x] of [XT + 1700, XT + 2700].entries()) add(`shell-flange-${k}`, latheX([[2960, x], [2960, x + 80]], 0, ZM, 18).color(millShell));
add('bearing-cap', latheX([[780, XT + 150], [780, XT + 550]], 0, ZM, 18).subtract(blk(XT, -900, ZM - 900, XT + 700, 900, ZM)).color(steel));
add('bearing-pedestal', blk(XT + 50, -1100, 0, XT + 650, 1100, ZM - 600).color('#9f9a90'));

// ---- Feed conveyor end ----
add('belt-carry', blk(-10200, -BW, ZC + 480, XH, BW, ZC + 500).color(wearLiner));
add('ore-on-belt', prismX([[-BW + 120, ZC + 500], [BW - 120, ZC + 500], [0, ZC + 820]], -10200, XH - 200).color(ore));
add('belt-return', blk(-10200, -BW, ZC - 520, XH, BW, ZC - 500).color(wearLiner));
add('head-pulley', latheY([[500, -BW - 50], [500, BW + 50]], XH, ZC, 16).color(chutePaint));
add('head-shaft', latheY([[80, -BW - 450], [80, BW + 450]], XH, ZC, 8).color(steel));
for (const [k, y] of [-BW - 330, BW + 330].entries()) add(`head-bearing-${k}`, blk(XH - 200, y - 90, ZC - 250, XH + 200, y + 90, ZC + 120).color(chutePaint));
for (const [k, y] of [-BW - 200, BW + 200].entries()) add(`stringer-${k}`, blk(-10200, y - 60, ZC - 300, XH - 200, y + 60, ZC - 100).color(steel));
for (const [j, x] of [-9400, -7800, -6200].entries()) {
  // Three-roll troughing idler set: flat centre roll and two wing rolls at 35 degrees.
  add(`idler-centre-${j}`, latheY([[65, -230], [65, 230]], x, ZC + 410, 10).color(steel));
  for (const [k, s] of [-1, 1].entries()) add(`idler-wing-${j}-${k}`, tube([x, s * 260, ZC + 410], [x, s * 640, ZC + 680], 65, 10).color(steel));
  add(`idler-frame-${j}`, blk(x - 40, -BW - 140, ZC - 100, x + 40, BW + 140, ZC + 340).color(steel));
  if (j !== 1) for (const [k, y] of [-BW - 200, BW + 200].entries()) add(`conveyor-leg-${j}-${k}`, blk(x - 70, y - 70, 0, x + 70, y + 70, ZC - 300).color(steel));
}

// ---- Head hood ----
const HX0 = XH - 700, HX1 = XH + 900;
add('head-hood', prismX([[-BW - 200, ZC - 800], [BW + 200, ZC - 800], [BW + 200, ZC + 700], [BW, ZC + 900], [-BW, ZC + 900], [-BW - 200, ZC + 700]], HX0 + 300, HX1).color(chutePaint));
add('hood-skirt', blk(HX0, -BW - 150, ZC + 450, HX0 + 300, BW + 150, ZC + 800).color(chutePaint));
add('hood-door', blk(XH - 200, -BW - 220, ZC + 100, XH + 500, -BW - 200, ZC + 600).color(chutePaint));
add('hood-door-handle', blk(XH + 380, -BW - 260, ZC + 300, XH + 420, -BW - 220, ZC + 400).color(rail));

// ---- Sloped lined trough with ore stream ----
const ax = HX1 - 500, az = ZC - 800, bx = 1100, bz = ZM + 1500;
const len = Math.hypot(bx - ax, az - bz), slope = (Math.atan2(az - bz, bx - ax) * 180) / Math.PI;
const along = (s) => s.rotateY(slope).translate(ax, 0, az);
add('trough', along(blk(0, -BW - 150, -500, len, BW + 150, 300).subtract(blk(-10, -BW, -380, len + 10, BW, 400))).color(chutePaint));
for (let i = 0; i < 5; i++) {
  const x0 = 60 + (i * (len - 120)) / 5;
  add(`wear-liner-${i}`, along(blk(x0, -BW + 10, -380, x0 + (len - 120) / 5 - 30, BW - 10, -320)).color(wearLiner));
  add(`liner-side-${i}`, along(blk(x0, -BW, -320, x0 + (len - 120) / 5 - 30, -BW + 50, 150)).color(wearLiner));
}
add('ore-stream', along(prismX([[-BW + 100, -320], [BW - 100, -320], [BW - 250, -180], [-BW + 250, -180]], 0, len - 200)).color(ore));
for (let i = 1; i < 4; i++) add(`trough-stiffener-${i}`, along(blk((i * len) / 4 - 40, -BW - 180, -530, (i * len) / 4 + 40, BW + 180, 330).subtract(blk((i * len) / 4 - 50, -BW - 140, -500, (i * len) / 4 + 50, BW + 140, 400))).color(chutePaint));

// ---- Drop box with inspection doors ----
add('drop-box', blk(bx - 200, -BW - 150, ZM + 700, bx + 700, BW + 150, ZM + 2200).color(chutePaint));
for (const [k, s] of [-1, 1].entries()) {
  add(`inspection-door-${k}`, blk(bx + 50, s * (BW + 150), ZM + 1150, bx + 550, s * (BW + 175), ZM + 1750).color(chutePaint));
  add(`door-handle-${k}`, blk(bx + 480, s * (BW + 175), ZM + 1400, bx + 520, s * (BW + 215), ZM + 1500).color(rail));
}

// ---- Feed spout on its trolley ----
const dx = out ? -1500 : 0;
add('spout-hopper', blk(bx - 100 + dx, -BW, ZM + 200, bx + 600 + dx, BW, ZM + 700).color(chutePaint));
add('spout', latheX([[430, bx + 600 + dx], [430, XT + 420 + dx]], 0, ZM, 14).color(chutePaint));
add('spout-liner', latheX([[400, XT + 400 + dx], [400, XT + 425 + dx]], 0, ZM, 14).color(wearLiner));
add('spout-ore', latheX([[200, XT + 425 + dx], [200, XT + 435 + dx]], 0, ZM - 150, 10).color(ore));
add('trolley-frame', blk(bx - 200 + dx, -BW - 200, ZM - 800, XT - 200 + dx, BW + 200, ZM - 600).color(steel));
add('trolley-post', blk(bx + 100 + dx, -300, ZM - 600, bx + 400 + dx, 300, ZM + 200).color(steel));
add('spout-saddle', blk(XT - 900 + dx, -350, ZM - 600, XT - 500 + dx, 350, ZM - 380).color(steel));
for (const [i, x] of [bx + dx, XT - 400 + dx].entries()) {
  for (const [j, y] of [-BW - 100, BW + 100].entries()) add(`trolley-wheel-${i}-${j}`, latheY([[150, y - 50], [150, y + 50]], x, ZM - 950, 12).color(dark));
}
for (const [k, y] of [-BW - 100, BW + 100].entries()) add(`trolley-rail-${k}`, blk(bx - 1900, y - 40, ZM - 1180, XT - 100, y + 40, ZM - 1100).color(steel));
add('rail-deck', blk(bx - 1900, -BW - 350, ZM - 1300, XT - 100, BW + 350, ZM - 1180).color(steel));
for (const [i, x] of [bx - 1800, XT - 250].entries()) {
  for (const [j, y] of [-BW - 250, BW + 250].entries()) add(`deck-column-${i}-${j}`, blk(x - 90, y - 90, 0, x + 90, y + 90, ZM - 1300).color(steel));
}
add('water-pipe', tube([bx - 1500, BW + 600, ZM + 2600], [bx + 250 + dx, BW + 600, ZM + 2600], 60, 8).color(water));
add('water-drop', tube([bx + 250 + dx, BW + 600, ZM + 2600], [bx + 250 + dx, BW + 20, ZM + 650], 60, 8).color(water));

// ---- Chute supports and access platform ----
const mid = (t) => [ax + t * (bx - ax), az + t * (bz - az)];
for (const [k, t] of [0.3, 0.75].entries()) {
  const [x, z] = mid(t);
  for (const [j, y] of [-BW - 300, BW + 300].entries()) add(`chute-column-${k}-${j}`, blk(x - 90, y - 90, 0, x + 90, y + 90, z - 500).color(steel));
  add(`chute-bearer-${k}`, blk(x - 100, -BW - 390, z - 640, x + 100, BW + 390, z - 500).color(steel));
}
const [px, pz] = mid(0.55);
add('platform', blk(px - 1200, -BW - 1400, pz - 1700, px + 1200, -BW - 400, pz - 1650).color(steel));
for (const [k, x] of [px - 1200, px, px + 1200].entries()) add(`platform-post-${k}`, rod(24, pz - 1650, pz - 550, 6).translate(x, -BW - 1400, 0).color(rail));
for (const [k, z] of [pz - 550, pz - 1100].entries()) add(`platform-rail-${k}`, tube([px - 1200, -BW - 1400, z], [px + 1200, -BW - 1400, z], 22, 6).color(rail));
for (const [k, x] of [px - 1100, px + 1100].entries()) add(`platform-leg-${k}`, blk(x - 70, -BW - 1300, 0, x + 70, -BW - 1160, pz - 1700).color(steel));

return p.model();
