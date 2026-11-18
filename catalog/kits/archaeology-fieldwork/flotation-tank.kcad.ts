// SPDX-License-Identifier: CC0-1.0
// Soil flotation machine, the drum-and-spout rig that floats charred seeds
// and charcoal out of bulk soil samples. What makes it one: an open steel drum
// on an angle-iron stand, full of water with a scum of floating flot; a
// sloping overflow spout carrying a water stream down into a fine-mesh flot
// sieve sat on a bucket; a pressurised inlet with gate valve, gauge and a
// garden hose running out across the ground; a drain tap for the heavy
// fraction at the foot of the drum.
// Millimetres, Z up, ground on z = 0, drum axis on the origin.
meta({
  name: "flotation-tank",
  license: 'CC0-1.0',
  title: "Soil flotation tank",
  description: "Siraf-style soil flotation machine at about real size: open 580 mm steel drum with rolling hoops on an angle-iron stand with cross bracing, water surface with floating flot, a sloping overflow spout with its water stream falling into a fine-mesh flot sieve on a bucket, a pressurised inlet with gate valve, handwheel and pressure gauge, a garden hose across the ground and a ball-valve drain tap. Material controls: drum paint, stainless steel, rubber, water; fieldReady, weathered and orangeDrum presets.",
  tags: ["archaeology", "excavation", "fieldwork", "flotation", "archaeobotany", "soil sampling", "sieve", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const drumPaint = param('drumPaint', '#2f68a0', { label: 'Drum paint' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel and stand' });
const rubber = param('rubber', '#2f5b3a', { label: 'Rubber hose and seals' });
const water = param('water', '#5f8f9a', { label: 'Water' });
presets({
  fieldReady: { drumPaint: '#3474b0', stainlessSteel: '#c7cdcf', rubber: '#3a7148', water: '#6a9ca6' },
  weathered: { drumPaint: '#4f6474', stainlessSteel: '#7a8588', rubber: '#3c4a3e', water: '#6f7d6a' },
  orangeDrum: { drumPaint: '#d9692b', stainlessSteel: '#b8c0c2', rubber: '#2b2f31', water: '#5f8f9a' },
});

const p = assembly("flotation-tank");
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
// Lathe along X / Y: [[radius, x or y], ...] rising, centred on the other two axes.
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
const outline = (pts) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close();
};
// Closed (x, z) profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => outline(pts).extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const polar = (r, deg, z) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180), z];

// Thin open-topped wall of n flat staves around Z, so the inside stays visible.
const wall = (r, z0, z1, t, n) => [...Array(n)].map((_, i) => {
  const w = (2 * Math.PI * r) / n + 2;
  return blk(r - t, -w / 2, z0, r, w / 2, z1).rotateZ((360 * i) / n);
});
const flot = '#2a2420', mesh = '#d9d4c3', bucket = '#d8d2bf', red = '#c23a2c', gaugeFace = '#eef0ea';

// ---- Stand ----
const S = 330, ZT = 480;
for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
  add(`leg-${sx}-${sy}`, blk(sx * S - 20, sy * S - 20, 0, sx * S + 20, sy * S + 20, ZT).color(stainlessSteel));
  add(`foot-${sx}-${sy}`, blk(sx * S - 45, sy * S - 45, 0, sx * S + 45, sy * S + 45, 6).color(stainlessSteel));
}
for (const s of [-1, 1]) {
  add(`rail-x-${s}`, blk(-S - 20, s * S - 20, ZT - 40, S + 20, s * S + 20, ZT).color(stainlessSteel));
  add(`rail-y-${s}`, blk(s * S - 20, -S - 20, ZT - 40, s * S + 20, S + 20, ZT).color(stainlessSteel));
  add(`brace-x-${s}`, tube([-S, s * S, 60], [S, s * S, ZT - 50], 9, 6).color(stainlessSteel));
  add(`brace-y-${s}`, tube([s * S, -S, 60], [s * S, S, ZT - 50], 9, 6).color(stainlessSteel));
}

// ---- Drum, water and flot ----
const R = 290, ZW = 1330, ZR = 1400;
add('drum-base', lathe([[R - 10, ZT], [R, ZT + 15]], 24).color(drumPaint));
add('drum-body', lathe([[R, ZT + 15], [R, ZW]], 24).color(drumPaint));
for (const z of [ZT + 290, ZT + 590]) add(`rolling-hoop-${z}`, lathe([[R + 9, z - 12], [R + 9, z + 12]], 24).color(drumPaint));
add('water-surface', lathe([[R - 6, ZW], [R - 6, ZW + 8]], 24).color(water));
wall(R, ZW, ZR, 8, 24).forEach((s, i) => add(`drum-wall-${i}`, s.color(drumPaint)));
wall(R + 5, ZR - 16, ZR, 14, 24).forEach((s, i) => add(`drum-chime-${i}`, s.color(drumPaint)));
for (let i = 0; i < 26; i++) {
  const [x, y] = polar(60 + ((i * 97) % 200), i * 47, 0);
  const sz = 10 + (i % 3) * 6;
  add(`flot-${i}`, blk(x - sz, y - sz / 2, ZW + 6, x + sz, y + sz / 2, ZW + 12).rotateZ((i * 31) % 90).color(flot));
}

// ---- Overflow spout and water stream into the flot sieve ----
const SX0 = R - 20, SX1 = 640, SZ0 = 1335, SZ1 = 1250, SW = 85;
add('spout-floor', sideY([[SX0, SZ0], [SX1, SZ1], [SX1, SZ1 - 8], [SX0, SZ0 - 8]], -SW, SW).color(stainlessSteel));
for (const s of [-1, 1]) {
  const y0 = s > 0 ? SW : -SW - 6, y1 = s > 0 ? SW + 6 : -SW;
  add(`spout-cheek-${s}`, sideY([[SX0, SZ0 - 8], [SX1, SZ1 - 8], [SX1, SZ1 + 50], [SX0, SZ0 + 70]], y0, y1).color(stainlessSteel));
}
add('spout-water', sideY([[SX0, ZW + 6], [SX1, SZ1 + 14], [SX1, SZ1], [SX0, SZ0]], -SW + 4, SW - 4).color(water));
const FX = 760; // flot sieve centre
add('water-fall', sideY([[SX1, SZ1 + 14], [SX1 + 40, SZ1 - 60], [SX1 + 90, 480], [SX1 + 60, 480], [SX1 + 10, SZ1 - 60], [SX1 - 4, SZ1]], -SW + 12, SW - 12).color(water));
add('bucket', lathe([[150, 0], [176, 400], [182, 420]], 20).translate(FX, 0, 0).color(bucket));
add('flot-mesh', lathe([[176, 470], [176, 476]], 20).translate(FX, 0, 0).color(mesh));
add('flot-catch', lathe([[120, 476], [60, 492]], 14).translate(FX, 0, 0).color(flot));
add('sieve-base', lathe([[180, 420], [180, 440]], 20).translate(FX, 0, 0).color(stainlessSteel));
wall(180, 440, 540, 5, 20).forEach((s, i) => add(`sieve-wall-${i}`, s.translate(FX, 0, 0).color(stainlessSteel)));
wall(185, 505, 540, 6, 20).forEach((s, i) => add(`sieve-band-${i}`, s.translate(FX, 0, 0).color(stainlessSteel)));
add('splash', lathe([[70, 476], [40, 500]], 10).translate(FX - 40, 0, 0).color(water));

// ---- Pressurised inlet: pipe, gate valve, gauge and hose ----
const IZ = 640, IY = -120;
add('inlet-pipe', latheX([[22, -R - 260], [22, -R + 10]], IY, IZ, 10).color(stainlessSteel));
add('inlet-flange', latheX([[40, -R - 12], [40, -R + 4]], IY, IZ, 12).color(stainlessSteel));
add('gate-valve-body', blk(-R - 200, IY - 38, IZ - 38, -R - 120, IY + 38, IZ + 38).color(stainlessSteel));
add('gate-valve-bonnet', rod(18, IZ + 38, IZ + 130, 10).translate(-R - 160, IY, 0).color(stainlessSteel));
add('handwheel', lathe([[62, IZ + 130], [62, IZ + 142]], 16).translate(-R - 160, IY, 0).color(red));
add('gauge-tee', rod(10, IZ + 20, IZ + 100, 8).translate(-R - 70, IY, 0).color(stainlessSteel));
add('gauge-case', latheY([[45, -30], [45, 0]], -R - 70, IZ + 140, 16).translate(0, IY, 0).color(stainlessSteel));
add('gauge-face', latheY([[38, -32], [38, -30]], -R - 70, IZ + 140, 16).translate(0, IY, 0).color(gaugeFace));
add('gauge-needle', blk(-R - 72, IY - 34, IZ + 140, -R - 68, IY - 33, IZ + 172).color(red));
add('hose-coupling', latheX([[30, -R - 300], [30, -R - 255]], IY, IZ, 10).color('#c9a23a'));
{
  const pts = [[-R - 300, IY, IZ], [-R - 400, IY - 10, IZ - 90], [-R - 470, IY - 30, IZ - 300], [-R - 520, IY - 60, 60], [-R - 580, IY - 90, 22]];
  for (let i = 0; i < 9; i++) {
    const a = 200 - i * 40;
    pts.push([-R - 820 + 240 * Math.cos((a * Math.PI) / 180), IY + 100 + 200 * Math.sin((a * Math.PI) / 180), 22]);
  }
  pts.push([-R - 1250, IY + 260, 22]);
  for (let i = 0; i < pts.length - 1; i++) add(`hose-${i}`, tube(pts[i], pts[i + 1], 18, 8).color(rubber));
}

// ---- Drain tap for the heavy fraction ----
add('drain-pipe', latheY([[18, R - 10], [18, R + 120]], 0, ZT + 70, 10).color(stainlessSteel));
add('drain-valve', blk(-30, R + 120, ZT + 40, 30, R + 180, ZT + 100).color(stainlessSteel));
add('drain-lever', blk(-8, R + 140, ZT + 100, 8, R + 160, ZT + 112).translate(0, 0, 0).color(red));
add('drain-lever-arm', blk(-8, R + 150, ZT + 104, 120, R + 160, ZT + 112).color(red));
add('drain-spout', rod(14, ZT - 40, ZT + 40, 10).translate(0, R + 150, 0).color(stainlessSteel));
add('drain-seal', lathe([[22, ZT - 52], [22, ZT - 40]], 10).translate(0, R + 150, 0).color(rubber));

return p.model();
