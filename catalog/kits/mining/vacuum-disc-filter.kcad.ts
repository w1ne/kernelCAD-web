// SPDX-License-Identifier: CC0-1.0
// Vacuum disc filter, the concentrate dewatering machine that pulls water out
// of slurry through cloth-covered discs. What makes one: a row of large
// vertical discs on one horizontal hollow shaft, each disc built from cloth
// sectors and dipping about a third of its height into a U-shaped slurry
// trough with a compartment per disc. Vacuum through the shaft builds a cake
// on the cloth as each sector rises out of the slurry; the cake is blown off
// into chutes between the discs on the falling side and carried away on a
// cake conveyor. Around it: a filter valve at one end of the shaft with
// vacuum lines to a vertical vacuum receiver, a shaft-mounted drive at the
// other end, bearing pedestals, a trough support frame and a service
// platform with handrails along the back.
// The disc choice sets 6 or 8 discs; the cake choice shows the discs
// loaded with cake or as clean cloth.
// Millimetres, Z up, shaft along X, cake side on -Y.
meta({
  name: "vacuum-disc-filter",
  license: 'CC0-1.0',
  title: "Vacuum disc filter",
  description: "Vacuum disc filter for concentrate dewatering at about real size: 2.7 m cloth-covered discs built from sectors on one horizontal hollow shaft, dipping into a U-shaped slurry trough with a compartment per disc, filter cake on the rising side, cake discharge chutes between the discs and a cake belt conveyor along the front, filter valve with vacuum lines to a vertical vacuum receiver and filtrate pump, shaft-mounted gearbox and motor, bearing pedestals, trough support frame and a rear service platform with handrails. Disc choice (6, 8) and cake choice (loaded, clean). Material controls: tank steel, filter cloth, filter cake and drive paint. weathered, copperConcentrate and ironOre presets.",
  tags: ['mining', 'mineral processing', 'dewatering', 'filter', 'vacuum filter', 'disc filter', 'concentrate'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 7000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const discs = param('discs', '6', { choices: ['6', '8'], label: 'Number of discs' });
const cakeState = param('cake', 'loaded', { choices: ['loaded', 'clean'], label: 'Filter cake' });
const tankSteel = param('tankSteel', '#3e6f8e', { label: 'Trough and frame steel' });
const filterCloth = param('filterCloth', '#d6d9d2', { label: 'Filter cloth' });
const filterCake = param('filterCake', '#7a6550', { label: 'Filter cake' });
const drivePaint = param('drivePaint', '#e0a526', { label: 'Drive and valve paint' });
presets({
  weathered: { tankSteel: '#5d666a', filterCloth: '#a9aaa2', filterCake: '#6e6257', drivePaint: '#9c8350' },
  copperConcentrate: { tankSteel: '#2f5a4a', filterCloth: '#c9cfc8', filterCake: '#4a4a3c', drivePaint: '#d8d2c2' },
  ironOre: { tankSteel: '#4a5560', filterCloth: '#bfc3bd', filterCake: '#7a3f2a', drivePaint: '#c8402c' },
});

const p = assembly("vacuum-disc-filter");
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
// Points on a circle about the shaft (y, z) between two angles, degrees from +Y towards +Z.
const arc = (r, a0, a1, steps) => Array.from({ length: steps + 1 }, (_, i) => {
  const t = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
  return [r * Math.cos(t), ZS + r * Math.sin(t)];
});

const slurry = '#5a5148', shaftGrey = '#9aa2a6', motorBlue = '#3d6f9a', rail = '#e8c21e', rubber = '#25282a';
const N = Number(discs.value);
const PITCH = 720; // disc centre spacing along the shaft
const L = N * PITCH + 500; // trough length
const X0 = -L / 2, X1 = L / 2;
const ZS = 1950; // shaft centre height
const R = 1350; // disc radius
const RT = 1480; // trough inner radius
const ZTOP = 1750; // trough rim height
const ZSL = 1420; // slurry level
const discX = Array.from({ length: N }, (_, i) => X0 + 250 + PITCH / 2 + i * PITCH);

// ---- Trough ----
const rimA = (Math.asin((ZTOP - ZS) / RT) * 180) / Math.PI; // rim angle, just below the shaft
const shell = [...arc(RT + 40, 180 - rimA, 360 + rimA, 14), ...arc(RT, 360 + rimA, 180 - rimA, 14)];
add('trough-shell', prismX(shell, X0, X1).color(tankSteel));
const endPlate = arc(RT + 40, 180 - rimA, 360 + rimA, 14);
add('trough-end-left', prismX(endPlate, X0 - 40, X0).color(tankSteel));
add('trough-end-right', prismX(endPlate, X1, X1 + 40).color(tankSteel));
for (const [k, s] of [-1, 1].entries()) add(`trough-rim-${k}`, blk(X0 - 40, s * (RT + 40) - (s < 0 ? 80 : 0), ZTOP - 20, X1 + 40, s * (RT + 40) + (s > 0 ? 80 : 0), ZTOP + 40).color(tankSteel));
// Slurry fills each compartment up to the slurry level.
const slA = (Math.asin((ZSL - ZS) / RT) * 180) / Math.PI;
add('slurry', prismX(arc(RT - 5, 180 - slA, 360 + slA, 12), X0, X1).color(slurry));
// Compartment dividers between the discs.
for (let i = 1; i < N; i++) {
  const x = X0 + 250 + i * PITCH;
  add(`divider-${i}`, prismX(arc(RT, 180 - slA, 360 + slA, 10), x - 12, x + 12).translate(0, 0, 25).color(tankSteel));
}

// ---- Shaft, discs and cake ----
add('shaft', latheX([[160, X0 - 700], [160, X1 + 500]], 0, ZS, 14).color(shaftGrey));
const SECTORS = 12;
for (const [i, x] of discX.entries()) {
  add(`disc-${i}`, latheX([[R, x - 30], [R, x + 30]], 0, ZS, 24).color(filterCloth));
  add(`disc-hub-${i}`, latheX([[330, x - 110], [330, x + 110]], 0, ZS, 12).color(tankSteel));
  // Sector seams: radial filtrate ribs on both faces.
  for (let k = 0; k < SECTORS; k++) {
    add(`disc-${i}-rib-${k}`, box(76, 34, R - 360, true).translate(x, 0, (R + 360) / 2).rotateX((360 * k) / SECTORS).translate(0, 0, ZS).color(tankSteel));
  }
  add(`disc-${i}-rim`, latheX([[R + 15, x - 40], [R + 15, x + 40]], 0, ZS, 24).subtract(latheX([[R - 25, x - 50], [R - 25, x + 50]], 0, ZS, 24)).color(tankSteel));
  // Cake builds on the rising side (+Y, turning towards the top) and is blown off before the -Y side.
  if (cakeState.value === 'loaded') {
    const sector = [...arc(R - 30, -40, 125, 10), ...arc(380, 125, -40, 4)];
    add(`disc-cake-${i}`, prismX(sector, x - 46, x + 46).color(filterCake));
  }
}

// ---- Cake discharge chutes and cake conveyor on the -Y side ----
const CY = -RT - 650; // cake conveyor centre line
for (let i = 0; i <= N; i++) {
  const x = X0 + 250 + i * PITCH;
  const w = i === 0 || i === N ? 110 : 220;
  add(`cake-chute-${i}`, prismX([[-RT + 300, ZTOP + 200], [-RT - 40, ZTOP + 200], [CY - 380, 1050], [CY + 120, 1050]], x - w / 2, x + w / 2).color(drivePaint));
}
add('cake-belt', blk(X0 - 900, CY - 450, 900, X1 + 300, CY + 450, 930).color(rubber));
if (cakeState.value === 'loaded') add('cake-on-belt', prismX([[-300, 930], [300, 930], [120, 1010], [-120, 1010]], X0 - 600, X1).translate(0, CY, 0).color(filterCake));
for (const [k, s] of [-1, 1].entries()) add(`cake-conveyor-stringer-${k}`, blk(X0 - 1000, CY + s * 520 - 50, 760, X1 + 400, CY + s * 520 + 50, 900).color(tankSteel));
for (const [k, x] of [X0 - 800, X0 + L / 3, X0 + (2 * L) / 3, X1 + 250].entries()) {
  for (const [j, s] of [-1, 1].entries()) add(`cake-conveyor-leg-${k}-${j}`, blk(x - 45, CY + s * 520 - 45, 0, x + 45, CY + s * 520 + 45, 760).color(tankSteel));
}
add('cake-tail-pulley', tube([X1 + 300, CY - 470, 760], [X1 + 300, CY + 470, 760], 160, 12).color(drivePaint));

// ---- Support frame ----
for (const [k, x] of [X0 + 200, 0, X1 - 200].entries()) {
  add(`saddle-${k}`, prismX([[-RT - 200, 0], [RT + 200, 0], [RT + 200, 250], ...arc(RT + 40, 360 - 30, 180 + 30, 8), [-RT - 200, 250]], x - 120, x + 120).color(tankSteel));
}
for (const [k, s] of [-1, 1].entries()) add(`base-beam-${k}`, blk(X0 - 300, s * (RT + 100) - 120, 0, X1 + 300, s * (RT + 100) + 120, 250).color(tankSteel));

// ---- Bearings and drive at +X ----
for (const [k, x] of [X0 - 350, X1 + 230].entries()) {
  add(`bearing-pedestal-${k}`, blk(x - 160, -320, 250, x + 160, 320, ZS - 200).color(tankSteel));
  add(`bearing-housing-${k}`, latheX([[260, x - 140], [260, x + 140]], 0, ZS, 12).color(drivePaint));
}
add('gearbox', blk(X1 + 450, -380, ZS - 520, X1 + 900, 420, ZS + 360).color(drivePaint));
add('torque-arm', blk(X1 + 620, -60, 250, X1 + 740, 60, ZS - 520).color(tankSteel));
add('drive-motor', latheX([[260, X1 + 950], [260, X1 + 1800]], 220, ZS - 120, 12).color(motorBlue));
add('motor-fan-cowl', latheX([[260, X1 + 1800], [230, X1 + 1950]], 220, ZS - 120, 12).color(motorBlue));

// ---- Filter valve and vacuum system at -X ----
const VX = X0 - 700;
add('filter-valve', latheX([[430, VX - 380], [430, VX]], 0, ZS, 14).color(drivePaint));
add('valve-cover', latheX([[300, VX - 520], [380, VX - 380]], 0, ZS, 14).color(drivePaint));
for (const [k, s] of [-1, 1].entries()) {
  add(`valve-spring-${k}`, tube([VX - 520, s * 280, ZS + 200], [VX - 120, s * 280, ZS + 200], 40, 6).color(shaftGrey));
}
const RX = VX - 1500, RY = 900; // vacuum receiver
add('receiver-shell', lathe([[650, 600], [650, 2900], [480, 3250], [160, 3380]], 14).translate(RX, RY, 0).color(tankSteel));
add('receiver-cone', lathe([[120, 300], [650, 600]], 14).translate(RX, RY, 0).color(tankSteel));
for (let k = 0; k < 4; k++) {
  const a = (Math.PI / 4) * (2 * k + 1);
  add(`receiver-leg-${k}`, blk(RX + 600 * Math.cos(a) - 50, RY + 600 * Math.sin(a) - 50, 0, RX + 600 * Math.cos(a) + 50, RY + 600 * Math.sin(a) + 50, 900).color(tankSteel));
}
for (const [k, z] of [ZS - 220, ZS + 220].entries()) {
  add(`vacuum-line-${k}`, tube([VX - 440, 0, z], [RX + 200, RY - 300, z + 600], 110, 10).color(drivePaint));
}
add('vacuum-line-riser', tube([RX, RY, 3380], [RX, RY, 3900], 120, 10).color(drivePaint));
add('vacuum-line-to-pump', tube([RX, RY, 3900], [RX, RY + 2200, 3900], 120, 10).color(drivePaint));
add('filtrate-pump', blk(RX - 300, RY - 1150, 0, RX + 300, RY - 750, 380).color(tankSteel));
add('filtrate-pump-casing', latheX([[230, RX - 380], [230, RX - 60]], RY - 950, 560, 12).color(drivePaint));
add('filtrate-pump-motor', latheX([[180, RX - 60], [180, RX + 420]], RY - 950, 560, 12).color(motorBlue));
add('filtrate-line', tube([RX, RY, 300], [RX - 200, RY - 950, 560], 70, 8).color(drivePaint));

// ---- Rear service platform on the +Y side ----
const PY0 = RT + 140, PY1 = RT + 1300, PZ = ZTOP + 40;
add('platform-deck', blk(X0 - 300, PY0, PZ - 40, X1 + 300, PY1, PZ).color(tankSteel));
for (const [k, x] of [X0 - 250, 0, X1 + 250].entries()) add(`platform-leg-${k}`, blk(x - 50, PY1 - 100, 0, x + 50, PY1, PZ - 40).color(tankSteel));
for (const [j, z] of [550, 1050].entries()) add(`platform-handrail-${j}`, tube([X0 - 300, PY1 - 40, PZ + z], [X1 + 300, PY1 - 40, PZ + z], 22, 6).color(rail));
for (let x = X0 - 300, i = 0; x <= X1 + 300; x += 1200, i++) add(`handrail-post-${i}`, blk(x - 22, PY1 - 62, PZ, x + 22, PY1 - 18, PZ + 1070).color(rail));

return p.model();
