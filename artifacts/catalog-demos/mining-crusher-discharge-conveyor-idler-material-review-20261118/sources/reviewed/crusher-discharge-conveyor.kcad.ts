// SPDX-License-Identifier: CC0-1.0
// Crusher discharge conveyor, the inclined belt that catches crushed ore
// falling out of the bottom of a crusher and lifts it away to the next
// stage. What makes one: a heavy loading zone at the tail, where the
// crusher discharge chute drops onto the belt between skirt boards over
// close-spaced impact idlers, then a 1200 mm troughed belt riding on
// three-roll idler sets up a 14 degree incline to a lagged head pulley
// with a shaft-mounted gearbox and motor, and a head chute that drops the
// ore off the far end. Around it: return idlers under the frame, belt
// covers over the carry run, a walkway with handrails along one side and
// steel trestles down to the ground.
// The cover choice puts on or takes off the belt covers; the load choice
// shows the belt loaded with ore or running empty.
// Millimetres, Z up, belt running up along +X.
meta({
  name: "crusher-discharge-conveyor",
  license: 'CC0-1.0',
  title: "Crusher discharge conveyor",
  description: "Inclined crusher discharge belt conveyor at about real size: 14 m long, 1200 mm troughed belt on three-roll idler sets rising at 14 degrees, loading zone with crusher discharge chute, skirt boards and close-spaced impact idlers at the tail, tail pulley, lagged head pulley with shaft-mounted gearbox, motor and coupling guard, head chute, return idlers, belt covers, side walkway with handrails and steel trestles with bracing. Cover choice (covered, open) and load choice (loaded, empty). Material controls: frame steel, drive paint, belt rubber and ore. weathered, coalHandling and highVisibility presets.",
  tags: ['mining', 'conveyor', 'belt conveyor', 'crusher', 'idler', 'materials handling', 'mineral processing'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cover = param('cover', 'covered', { choices: ['covered', 'open'], label: 'Belt covers' });
const load = param('load', 'loaded', { choices: ['loaded', 'empty'], label: 'Belt load' });
const frameSteel = param('frameSteel', '#58646c', { label: 'Frame steel' });
const drivePaint = param('drivePaint', '#2f6f4a', { label: 'Drive and chute paint' });
const beltRubber = param('beltRubber', '#25282a', { label: 'Belt rubber' });
const ore = param('ore', '#7a6552', { label: 'Ore' });
presets({
  weathered: { frameSteel: '#6a645c', drivePaint: '#5d6152', beltRubber: '#34322f', ore: '#8a7462' },
  coalHandling: { frameSteel: '#3f4a52', drivePaint: '#d39a22', beltRubber: '#1f2123', ore: '#1c1c1e' },
  highVisibility: { frameSteel: '#e48a1e', drivePaint: '#2d3a45', beltRubber: '#26292b', ore: '#9c6a48' },
});

const p = assembly("crusher-discharge-conveyor");
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

const rail = '#e8c21e', shaft = '#9aa2a6', motorBlue = '#3d6f9a';
const L = 14000; // tail to head pulley centres along the belt
const A = 14; // incline, degrees
const Z0 = 1500; // belt line height above the tail pulley
const ca = Math.cos((A * Math.PI) / 180), sa = Math.sin((A * Math.PI) / 180);
// Conveyor parts are drawn with the belt line along local +X at z = 0, then tilted up.
const tilt = (s) => s.rotateY(-A).translate(0, 0, Z0);
const world = (x, z) => [x * ca - z * sa, Z0 + x * sa + z * ca];
const BW = 600; // half belt width
const SY = BW + 230; // stringer centre line
const RP = 300; // pulley radius

// ---- Stringers, pulleys and belt ----
for (const [k, s] of [-1, 1].entries()) add(`stringer-${k}`, tilt(blk(-300, s * SY - 90, -560, L + 300, s * SY + 90, -300)).color(frameSteel));
for (const [name, x, r] of [['tail', 0, RP], ['head', L, RP + 30]]) {
  add(`${name}-pulley`, tilt(latheY([[r, -BW - 50], [r, BW + 50]], x, -RP - 60, 16)).color(name === 'head' ? beltRubber : drivePaint));
  add(`${name}-shaft`, tilt(latheY([[65, -SY - 200], [65, SY + 200]], x, -RP - 60, 8)).color(shaft));
  for (const [k, s] of [-1, 1].entries()) add(`${name}-bearing-${k}`, tilt(blk(x - 170, s * (SY + 110) - 80, -RP - 200, x + 170, s * (SY + 110) + 80, -RP + 60)).color(drivePaint));
}
// Troughed belt: flat centre and two 35 degree wings.
const trough = [[-BW, 190], [-200, -65], [200, -65], [BW, 190], [BW, 208], [200, -47], [-200, -47], [-BW, 208]];
add('belt-carry', tilt(prismX(trough, 0, L)).color(beltRubber));
add('belt-return', tilt(blk(0, -BW + 40, -2 * RP - 80, L, BW - 40, -2 * RP - 62)).color(beltRubber));
if (load.value === 'loaded') {
  add('ore-load', tilt(prismX([[-430, 70], [-200, -47], [200, -47], [430, 70], [260, 190], [0, 250], [-260, 190]], 700, L - 250)).color(ore));
  // Ore falling off the head pulley into the head chute.
  const [hx, hz] = world(L + 250, 0);
  add('ore-stream', lathe([[220, hz - 2200], [330, hz - 300]], 9).scale([1, 1.4, 1]).translate(hx + 350, 0, 0).color(ore));
}

// ---- Idlers ----
const idlerSet = (name, x, gap) => {
  add(`${name}-centre`, tilt(latheY([[65, -195], [65, 195]], x, -130, 10)).color(drivePaint));
  for (const [k, s] of [-1, 1].entries()) add(`${name}-wing-${k}`, tilt(tube([x, s * 215, -130], [x, s * 560, 115], 65, 10)).color(drivePaint));
  if (!gap) add(`${name}-frame`, tilt(blk(x - 45, -SY, -330, x + 45, SY, -260)).color(frameSteel));
};
for (let x = 500, i = 0; x <= 3000; x += 500, i++) idlerSet(`impact-idler-${i}`, x, false);
for (let x = 4200, i = 0; x <= L - 600; x += 1300, i++) idlerSet(`carry-idler-${i}`, x, false);
for (let x = 2000, i = 0; x <= L - 1000; x += 3000, i++) {
  add(`return-idler-${i}`, tilt(latheY([[70, -BW - 30], [70, BW + 30]], x, -2 * RP - 150, 10)).color(drivePaint));
  for (const [k, s] of [-1, 1].entries()) add(`return-hanger-${i}-${k}`, tilt(blk(x - 30, s * (BW + 70) - 25, -2 * RP - 200, x + 30, s * (BW + 70) + 25, -300)).color(frameSteel));
}

// ---- Loading zone ----
for (const [k, s] of [-1, 1].entries()) {
  add(`skirt-board-${k}`, tilt(blk(150, s * 470 - 12, 60, 3400, s * 470 + 12, 600)).color(drivePaint));
  add(`skirt-rubber-${k}`, tilt(blk(150, s * 455 - 8, -20, 3400, s * 455 + 8, 80)).color(beltRubber));
  for (let x = 450, i = 0; x < 3400; x += 600, i++) add(`skirt-clamp-${k}-${i}`, tilt(blk(x - 40, s * 500 - 30, 100, x + 40, s * 500 + 30, 520)).color(frameSteel));
}
add('skirt-cover', tilt(blk(1600, -485, 590, 3400, 485, 620)).color(drivePaint));
// Crusher discharge chute coming down onto the tail from above.
const [cx, cz] = world(900, 600);
add('discharge-chute', blk(cx - 650, -470, cz, cx + 650, 470, cz + 2200).color(drivePaint));
add('discharge-flange', blk(cx - 760, -580, cz + 2200, cx + 760, 580, cz + 2300).color(frameSteel));
for (const [k, s] of [-1, 1].entries()) add(`chute-stiffener-${k}`, blk(cx - 660, s * 470 - (s < 0 ? 40 : 0), cz + 1000, cx + 660, s * 470 + (s > 0 ? 40 : 0), cz + 1080).color(frameSteel));

// ---- Belt covers ----
if (cover.value === 'covered') {
  const arc = [];
  for (let i = 0; i <= 8; i++) {
    const t = (Math.PI * i) / 8;
    arc.push([-760 * Math.cos(t), 160 + 560 * Math.sin(t)]);
  }
  for (let i = 8; i >= 0; i--) {
    const t = (Math.PI * i) / 8;
    arc.push([-730 * Math.cos(t), 160 + 530 * Math.sin(t)]);
  }
  for (let x = 3700, i = 0; x + 1800 <= L - 700; x += 2000, i++) add(`belt-cover-${i}`, tilt(prismX(arc, x, x + 1800)).color(drivePaint));
}

// ---- Head end: drive and chute ----
const DY = SY + 330;
add('gearbox', tilt(blk(L - 280, DY - 180, -RP - 360, L + 280, DY + 220, -RP + 280)).color(drivePaint));
add('torque-arm', tilt(blk(L - 60, DY - 40, -RP - 900, L + 60, DY + 40, -RP - 360)).color(frameSteel));
add('motor', tilt(latheX([[230, L - 1450], [230, L - 500]], DY + 20, -RP - 40, 12)).color(motorBlue));
add('motor-fan-cowl', tilt(latheX([[200, L - 1600], [230, L - 1450]], DY + 20, -RP - 40, 12)).color(motorBlue));
add('coupling-guard', tilt(blk(L - 500, DY - 150, -RP - 200, L - 280, DY + 190, -RP + 120)).color(rail));
const [hx, hz] = world(L, 0);
add('head-hood', blk(hx - 500, -BW - 200, hz - 700, hx + 900, BW + 200, hz + 600).color(drivePaint));
add('head-chute', blk(hx + 100, -BW, hz - 2600, hx + 1100, BW, hz - 700).color(drivePaint));
add('head-chute-flange', blk(hx + 50, -BW - 60, hz - 2680, hx + 1150, BW + 60, hz - 2600).color(frameSteel));
add('head-scraper', tilt(blk(L - 120, -BW, -2 * RP - 200, L + 80, BW, -2 * RP - 120)).color(rail));

// ---- Walkway and handrail along the -Y side ----
const WY0 = -SY - 1050, WY1 = -SY - 90;
add('walkway', tilt(blk(-300, WY0, -480, L + 300, WY1, -440)).color(frameSteel));
for (const [j, z] of [600, 1060].entries()) add(`handrail-${j}`, tilt(tube([-300, WY0 + 30, z - 440], [L + 300, WY0 + 30, z - 440], 22, 6)).color(rail));
for (let x = -300, i = 0; x <= L + 300; x += 1800, i++) add(`handrail-post-${i}`, tilt(blk(x - 22, WY0 + 8, -440, x + 22, WY0 + 52, 620)).color(rail));

// ---- Trestles ----
for (const [i, x] of [600, 5000, 9500, 13400].entries()) {
  const [tx, tz] = world(x, -560);
  const wide = i === 3;
  for (const [k, y] of [-SY, SY, ...(wide ? [] : [WY0 + 60])].entries()) {
    add(`trestle-${i}-leg-${k}`, blk(tx - 90, y - 90, 0, tx + 90, y + 90, tz).color(frameSteel));
    add(`trestle-${i}-plate-${k}`, blk(tx - 200, y - 200, 0, tx + 200, y + 200, 25).color(frameSteel));
  }
  if (tz > 1200) {
    add(`trestle-${i}-tie`, blk(tx - 70, -SY, tz * 0.45 - 60, tx + 70, SY, tz * 0.45 + 60).color(frameSteel));
    add(`trestle-${i}-brace`, tube([tx, -SY, 150], [tx, SY, tz * 0.45], 40, 6).color(frameSteel));
  }
}

return p.model();
