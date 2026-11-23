// SPDX-License-Identifier: CC0-1.0
// Tailings stack conveyor, the crawler-mounted mobile stacker that places
// filtered dry tailings in terraced stacks. What makes one: a 22 m tubular
// lattice boom rising at 16 degrees from a pinned tail on a skid, carrying a
// troughed belt of pale filter cake to a head pulley under a discharge hood
// with its drive. The boom stands on an A-frame and a luffing ram from a
// crawler carrier with two tracked undercarriages and a diesel power pack,
// so the stacker can walk along the face. A square feed hopper over the
// tail takes cake from the plant; a walkway with handrails runs up the -Y
// side. Under the head grows the terraced dry stack, benched in lifts.
// The stack choice shows the terraced stack or bare ground; the load choice
// shows the belt loaded with cake or running empty.
// Millimetres, Z up, boom rising towards +X, ground origin under the tail.
meta({
  name: "tailings-stack-conveyor",
  license: 'CC0-1.0',
  title: "Tailings stack conveyor",
  description: "Crawler-mounted dry-stack tailings stacker at about real size: 22 m tubular lattice boom with chords, verticals and diagonals rising at 16 degrees from a pinned tail skid, troughed belt carrying filter cake on three-roll idlers, square feed hopper over the tail pulley, head pulley under a discharge hood with gearbox and motor, side walkway with handrails, A-frame struts and a luffing ram down to a crawler carrier with two tracked undercarriages, grousers, sprockets and a diesel power pack with exhaust, and a terraced dry stack of tailings benched in lifts under the head. Stack choice (terraced, none) and load choice (loaded, empty). Material controls: boom paint, crawler steel, belt rubber and tailings. weathered, ironTailings and coalReject presets.",
  tags: ['mining', 'tailings', 'dry stack', 'stacker', 'conveyor', 'crawler', 'mineral processing'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stack = param('stack', 'terraced', { choices: ['terraced', 'none'], label: 'Tailings stack' });
const load = param('load', 'loaded', { choices: ['loaded', 'empty'], label: 'Belt load' });
const boomPaint = param('boomPaint', '#e2b12a', { label: 'Boom and frame paint' });
const crawlerSteel = param('crawlerSteel', '#3a3f44', { label: 'Crawler steel' });
const beltRubber = param('beltRubber', '#25282a', { label: 'Belt rubber' });
const tailings = param('tailings', '#b9ab92', { label: 'Filtered tailings' });
presets({
  weathered: { boomPaint: '#a88a4a', crawlerSteel: '#4a4a46', beltRubber: '#34322f', tailings: '#a39a88' },
  ironTailings: { boomPaint: '#e2b12a', crawlerSteel: '#3a3f44', beltRubber: '#26292b', tailings: '#9a5a3e' },
  coalReject: { boomPaint: '#d9d9d2', crawlerSteel: '#2e3236', beltRubber: '#1f2123', tailings: '#3a3a3a' },
});

const p = assembly("tailings-stack-conveyor");
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
// Closed (x, z) outline extruded along Y from y0 to y1.
const prismY = (pts, y0, y1) => prismX(pts.map(([x, z]) => [-x, z]), y0, y1).rotateZ(90);

const shaft = '#9aa2a6', motorBlue = '#3d6f9a', rail = '#e8c21e', idlerGrey = '#6a7176', ground = '#8c8270';
const L = 22000; // tail to head pulley centres along the belt
const A = 16; // boom angle, degrees
const Z0 = 1900; // belt line height above the tail pivot
const ca = Math.cos((A * Math.PI) / 180), sa = Math.sin((A * Math.PI) / 180);
// Boom parts are drawn with the belt line along local +X at z = 0, then tilted up.
const tilt = (s) => s.rotateY(-A).translate(0, 0, Z0);
const world = (x, z) => [x * ca - z * sa, Z0 + x * sa + z * ca];
const BW = 500; // half belt width
const TY = 750; // half truss width
const ZTC = -300, ZBC = -1500; // top and bottom chord heights, local
const PANEL = 2000;

// ---- Lattice boom ----
for (const [s, y] of [-TY, TY].entries()) {
  add(`top-chord-${s}`, tilt(tube([-400, y, ZTC], [L + 200, y, ZTC], 90, 8)).color(boomPaint));
  add(`bottom-chord-${s}`, tilt(tube([-400, y, ZBC], [L - 1800, y, ZTC - 300], 90, 8)).color(boomPaint));
  for (let k = 0, x = 0; x <= L - 2000; x += PANEL, k++) {
    const zb = ZBC + ((ZTC - 300 - ZBC) * (x + 400)) / (L - 1400);
    add(`vertical-${s}-${k}`, tilt(tube([x, y, zb], [x, y, ZTC], 45, 6)).color(boomPaint));
    if (x + PANEL <= L - 2000) {
      const zb2 = ZBC + ((ZTC - 300 - ZBC) * (x + PANEL + 400)) / (L - 1400);
      add(`diagonal-${s}-${k}`, tilt(tube([x, y, ZTC], [x + PANEL, y, zb2], 40, 6)).color(boomPaint));
    }
  }
}
for (let k = 0, x = 0; x <= L - 2000; x += PANEL, k++) {
  const zb = ZBC + ((ZTC - 300 - ZBC) * (x + 400)) / (L - 1400);
  add(`bottom-tie-${k}`, tilt(blk(x - 50, -TY, zb - 50, x + 50, TY, zb + 50)).color(boomPaint));
}

// ---- Belt, pulleys and idlers ----
const trough = [[-BW, 160], [-170, -55], [170, -55], [BW, 160], [BW, 176], [170, -40], [-170, -40], [-BW, 176]];
add('belt-carry', tilt(prismX(trough, 0, L)).color(beltRubber));
if (load.value === 'loaded') add('cake-load', tilt(prismX([[-360, 60], [-170, -40], [170, -40], [360, 60], [200, 150], [0, 200], [-200, 150]], 900, L - 200)).color(tailings));
add('tail-pulley', tilt(tube([0, -BW - 60, -260], [0, BW + 60, -260], 260, 14)).color(crawlerSteel));
add('head-pulley', tilt(tube([L, -BW - 60, -280], [L, BW + 60, -280], 300, 14)).color(beltRubber));
add('head-shaft', tilt(tube([L, -TY - 450, -280], [L, TY + 150, -280], 60, 8)).color(shaft));
for (let i = 0, x = 900; x <= L - 600; x += 1500, i++) {
  add(`idler-${i}-centre`, tilt(tube([x, -165, -110], [x, 165, -110], 55, 6)).color(idlerGrey));
  for (const [k, s] of [-1, 1].entries()) add(`idler-${i}-wing-${k}`, tilt(tube([x, s * 185, -110], [x, s * 470, 95], 55, 6)).color(idlerGrey));
  add(`idler-${i}-frame`, tilt(blk(x - 35, -TY, -260, x + 35, TY, -180)).color(boomPaint));
}

// ---- Feed hopper over the tail ----
const [fx, fz] = world(500, 300);
add('feed-hopper', lathe([[480, fz], [1150, fz + 1100]], 4).rotateZ(45).translate(fx, 0, 0).color(boomPaint));
add('feed-hopper-rim', lathe([[1180, fz + 1100], [1180, fz + 1180]], 4).rotateZ(45).translate(fx, 0, 0).color(crawlerSteel));
if (load.value === 'loaded') add('feed-hopper-cake', lathe([[1080, fz + 1000], [300, fz + 1350]], 4).rotateZ(45).translate(fx, 0, 0).color(tailings));

// ---- Head: hood and drive ----
const [hx, hz] = world(L, -280);
add('discharge-hood', blk(hx - 900, -TY - 150, hz - 100, hx + 600, TY + 150, hz + 650).color(boomPaint));
add('hood-skirt', blk(hx + 350, -TY - 150, hz - 700, hx + 650, TY + 150, hz - 100).color(boomPaint));
add('gearbox', tilt(blk(L - 300, -TY - 700, -620, L + 300, -TY - 260, 60)).color(crawlerSteel));
add('motor', tilt(tube([L - 1500, -TY - 480, -300], [L - 300, -TY - 480, -300], 230, 12)).color(motorBlue));

// ---- Walkway and handrail along the -Y side ----
const WY0 = -TY - 1000, WY1 = -TY - 100;
add('walkway', tilt(blk(-300, WY0, -480, L - 1600, WY1, -440)).color(crawlerSteel));
for (const [j, z] of [600, 1060].entries()) add(`handrail-${j}`, tilt(tube([-300, WY0 + 30, z - 440], [L - 1600, WY0 + 30, z - 440], 22, 6)).color(rail));
for (let x = -300, i = 0; x <= L - 1600; x += 1900, i++) add(`handrail-post-${i}`, tilt(blk(x - 22, WY0 + 8, -440, x + 22, WY0 + 52, 620)).color(rail));
for (let x = 1000, i = 0; x <= L - 2600; x += 3000, i++) add(`walkway-bracket-${i}`, tilt(blk(x - 40, WY0, -560, x + 40, -TY, -480)).color(boomPaint));

// ---- Tail skid and pivot ----
const [px, pz] = world(-200, ZBC);
add('tail-skid', blk(px - 1400, -1300, 0, px + 1000, 1300, 300).color(crawlerSteel));
add('tail-pedestal', blk(px - 300, -900, 300, px + 300, 900, pz + 60).color(boomPaint));
add('tail-pivot-pin', tube([px, -TY - 200, pz], [px, TY + 200, pz], 110, 10).color(shaft));

// ---- Crawler carrier ----
const CX = 7000; // crawler centre
const TL = 2600; // half track length
const stadium = [];
for (let i = 0; i <= 6; i++) {
  const t = -Math.PI / 2 + (Math.PI * i) / 6;
  stadium.push([TL - 500 + 500 * Math.cos(t), 500 + 500 * Math.sin(t)]);
}
for (let i = 0; i <= 6; i++) {
  const t = Math.PI / 2 + (Math.PI * i) / 6;
  stadium.push([-TL + 500 + 500 * Math.cos(t), 500 + 500 * Math.sin(t)]);
}
for (const [k, s] of [-1, 1].entries()) {
  const y = s * 1700;
  add(`track-${k}`, prismY(stadium, y - 400, y + 400).translate(CX, 0, 0).color(beltRubber));
  add(`track-frame-${k}`, blk(CX - TL + 450, y - 430, 250, CX + TL - 450, y + 430, 800).color(crawlerSteel));
  add(`sprocket-${k}`, tube([CX + TL - 500, y - 460, 500], [CX + TL - 500, y + 460, 500], 330, 10).color(crawlerSteel));
  for (let g = 0; g < 9; g++) {
    const gx = CX - TL + 700 + g * ((2 * TL - 1400) / 8);
    add(`grouser-${k}-${g}`, blk(gx - 50, y - 400, 1000, gx + 50, y + 400, 1060).color(beltRubber));
  }
}
add('carrier-deck', blk(CX - 1800, -1350, 800, CX + 1800, 1350, 1150).color(boomPaint));
add('power-pack', blk(CX - 1700, -1250, 1150, CX - 300, 300, 2400).color(boomPaint));
add('power-pack-grille', blk(CX - 1720, -1150, 1300, CX - 1700, 200, 2200).color(crawlerSteel));
add('exhaust-stack', tube([CX - 600, -900, 2400], [CX - 600, -900, 3300], 90, 8).color(crawlerSteel));
// A-frame struts and luffing ram up to the boom bottom chords.
const XS = 9000;
const zsb = ZBC + ((ZTC - 300 - ZBC) * (XS + 400)) / (L - 1400);
const [sx, sz] = world(XS, zsb);
for (const [k, s] of [-1, 1].entries()) {
  add(`a-frame-front-${k}`, tube([CX + 1500, s * 1200, 1150], [sx, s * TY, sz], 120, 8).color(boomPaint));
  add(`a-frame-rear-${k}`, tube([CX - 200, s * 1200, 1150], [sx, s * TY, sz], 120, 8).color(boomPaint));
}
const XR = 12500;
const [rx, rz] = world(XR, ZBC + ((ZTC - 300 - ZBC) * (XR + 400)) / (L - 1400));
const rm = [CX + 1700 + (rx - CX - 1700) * 0.55, 0, 1150 + (rz - 1150) * 0.55];
add('luffing-ram-barrel', tube([CX + 1700, 0, 1150], rm, 150, 10).color(crawlerSteel));
add('luffing-ram-rod', tube(rm, [rx, 0, rz], 85, 8).color(shaft));

// ---- Terraced dry stack under the head ----
if (stack.value === 'terraced') {
  const SX = hx + 700;
  add('dry-stack', lathe([[7600, 0], [6300, 1600], [5600, 1610], [4400, 3200], [3700, 3210], [2500, 4800], [1800, 4810], [500, 5900], [150, 6000]], 18).translate(SX, 0, 0).color(tailings));
  add('stack-toe', lathe([[8200, 0], [7700, 120]], 18).translate(SX, 0, 0).color(ground));
  if (load.value === 'loaded') add('cake-stream', lathe([[260, 5900], [420, hz - 500]], 8).translate(hx + 550, 0, 0).color(tailings));
}

return p.model();
