// SPDX-License-Identifier: CC0-1.0
// Run-of-mine (ROM) hopper, the dump pocket where haul trucks tip blasted ore
// at the head of the crushing plant. What makes it one: a big steel bin shaped
// like an upside-down pyramid, its sloped walls ribbed on the outside and
// ending in a narrow discharge throat with a gate, standing on braced
// columns against a concrete retaining wall. Trucks back up on the deck
// behind the wall, stop at the bump block and tip over the edge onto a static
// grizzly of heavy rails that holds back oversize boulders for the rock
// breaker. A traffic signal tells drivers when to tip.
// Millimetres, Z up, tipping deck towards +X, open sloped walls towards the
// -X/-Y (front) side, throat on the axis.
meta({
  name: "run-of-mine-hopper",
  license: 'CC0-1.0',
  title: "Run-of-mine hopper",
  description: "ROM dump hopper at about real size: inverted-pyramid steel bin with ribbed sloped walls, wear-plate rim and a square discharge throat with hydraulic flop gate, four braced columns with a ring beam, a static grizzly of heavy rails across the mouth holding oversize boulders, a concrete retaining wall and truck tipping deck with bump block, tipping traffic signal and dust-suppression spray bar. Material controls: hopper coating, columns and grizzly steel, retaining wall concrete and run-of-mine ore, plus a load choice (full with a heap and boulders, or empty showing the liners). weathered, highVisibility and blueBin presets.",
  tags: ['mining', 'ore handling', 'ROM hopper', 'dump pocket', 'grizzly', 'haul truck tipping', 'crushing plant', 'bulk materials'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#c9952e', { label: 'Hopper coating' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Columns and grizzly steel' });
const concrete = param('concrete', '#a6a196', { label: 'Retaining wall concrete' });
const ore = param('ore', '#8a7d6c', { label: 'Run-of-mine ore' });
const load = param('load', 'full', { choices: ['full', 'empty'], label: 'Hopper load' });
presets({
  weathered: { coatedSteel: '#8a7458', structuralSteel: '#666a66', concrete: '#918c82', ore: '#7d7062' },
  highVisibility: { coatedSteel: '#f0a81c', structuralSteel: '#465159', concrete: '#b5b0a4', ore: '#9a8b78' },
  blueBin: { coatedSteel: '#2f6fb0', structuralSteel: '#2d3134', concrete: '#a6a196', ore: '#6f4a3a' },
});

const p = assembly("run-of-mine-hopper");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const rect = (hx, hy) => path().moveTo(-hx, -hy).lineTo(hx, -hy).lineTo(hx, hy).lineTo(-hx, hy).close();
// Square frustum, half-size h0 at z0 to h1 at z1.
const frustum = (h0, z0, h1, z1) => rect(h0, h0).loft([rect(h1, h1)], { planes: [{ plane: 'XY', origin: [0, 0, z0] }, { plane: 'XY', origin: [0, 0, z1] }], ruled: true });

const oreDark = '#6f6457', dark = '#1e2123', warn = '#e8c21e', wear = '#8d918e', red = '#c8322b', green = '#3fa34d';
const full = load.value === 'full';
const Zt = 4600, Zbot = 1500, Ht = 3000, Hb = 800, T = 90; // rim, throat, half-sizes, plate
const half = (z) => Hb + ((Ht - Hb) * (z - Zbot)) / (Zt - Zbot);

// ---- Hopper bin: hollow inverted pyramid with throat ----
add('hopper-bin', frustum(Hb, Zbot, Ht, Zt).subtract(frustum(half(Zbot - 100) - T, Zbot - 100, half(Zt + 100) - T, Zt + 100)).color(coatedSteel));
add('discharge-throat', blk(-Hb, -Hb, Zbot - 700, Hb, Hb, Zbot).subtract(blk(-Hb + T, -Hb + T, Zbot - 710, Hb - T, Hb - T, Zbot + 10)).color(coatedSteel));
add('rim-wear-plate', blk(-Ht - 80, -Ht - 80, Zt - 250, Ht + 80, Ht + 80, Zt + 40).subtract(blk(-Ht + T, -Ht + T, Zt - 260, Ht - T, Ht - T, Zt + 50)).color(wear));
// Vertical stiffening ribs on the two visible sloped faces (-X, -Y).
const slope = (Math.atan2(Ht - Hb, Zt - Zbot) * 180) / Math.PI;
for (const [k, u] of [-1800, -600, 600, 1800].entries()) {
  const zm = (Zbot + Zt) / 2, hm = half(zm);
  add(`rib-front-${k}`, blk(-60, -90, -(Zt - Zbot) / 2 / Math.cos((slope * Math.PI) / 180) + 120, 60, 90, (Zt - Zbot) / 2 / Math.cos((slope * Math.PI) / 180) - 280)
    .rotateX(slope).translate(u * hm / Ht, -hm - 60, zm).color(coatedSteel));
  add(`rib-side-${k}`, blk(-90, -60, -(Zt - Zbot) / 2 / Math.cos((slope * Math.PI) / 180) + 120, 90, 60, (Zt - Zbot) / 2 / Math.cos((slope * Math.PI) / 180) - 280)
    .rotateY(-slope).translate(-hm - 60, u * hm / Ht, zm).color(coatedSteel));
}
for (const [k, z] of [2500, 3600].entries()) {
  const h = half(z);
  add(`ring-stiffener-${k}`, frustum(h + 70, z, h + 70 + ((Ht - Hb) * 140) / (Zt - Zbot), z + 140).subtract(frustum(h - 20, z - 10, h - 20 + ((Ht - Hb) * 160) / (Zt - Zbot), z + 150)).color(structuralSteel));
}
if (!full) {
  for (const [k, z] of [2300, 3200, 4100].entries()) {
    const h = half(z) - T;
    add(`liner-band-${k}`, frustum(h - 2, z, h - 2 + ((Ht - Hb) * 300) / (Zt - Zbot), z + 300).subtract(frustum(h - 40, z - 10, h - 40 + ((Ht - Hb) * 320) / (Zt - Zbot), z + 310)).color(wear));
  }
}

// ---- Flop gate under the throat ----
add('flop-gate', blk(-Hb + 40, -Hb - 60, Zbot - 1100, Hb - 40, Hb + 60, Zbot - 700).color(structuralSteel));
add('gate-cylinder', tube([-Hb - 500, -Hb - 160, 200], [-Hb - 40, -Hb - 160, Zbot - 850], 80, 8).color(warn));
add('gate-cylinder-mount', blk(-Hb - 650, -Hb - 260, 0, -Hb - 350, -Hb - 60, 250).color(structuralSteel));

// ---- Columns, ring beam and bracing ----
const C = Ht + 250;
for (const [k, [x, y]] of [[-C, -C], [-C, C], [C, -C], [C, C]].entries()) {
  add(`column-${k}`, blk(x - 180, y - 180, 0, x + 180, y + 180, Zt - 300).color(structuralSteel));
  add(`column-base-${k}`, blk(x - 380, y - 380, 0, x + 380, y + 380, 300).color(concrete));
}
add('ring-beam', blk(-C - 200, -C - 200, Zt - 500, C + 200, C + 200, Zt - 250).subtract(blk(-C + 150, -C + 150, Zt - 510, C - 150, C - 150, Zt - 240)).color(structuralSteel));
for (const [k, [a, b]] of [
  [[-C, -C, 400], [C, -C, Zt - 550]],
  [[C, -C, 400], [-C, -C, Zt - 550]],
  [[-C, C, 400], [-C, -C, Zt - 550]],
  [[-C, -C, 400], [-C, C, Zt - 550]],
].entries()) {
  add(`column-brace-${k}`, tube(a, b, 70, 6).color(structuralSteel));
}

// ---- Static grizzly of rails across the mouth ----
for (const [k, x] of [-Ht + 200, 0, Ht - 200].entries()) add(`grizzly-bearer-${k}`, blk(x - 150, -Ht - 60, Zt + 40, x + 150, Ht + 60, Zt + 340).color(structuralSteel));
for (let i = 0; i < 11; i++) {
  const y = -Ht + 250 + (i * (2 * Ht - 500)) / 10;
  add(`grizzly-rail-${i}`, blk(-Ht - 60, y - 70, Zt + 340, Ht + 60, y + 70, Zt + 560).color(wear));
}

// ---- Ore heap and oversize boulders ----
if (full) {
  add('ore-heap', sphere(Ht).scale([0.95, 0.95, 0.42]).translate(0, 0, Zt - 300).subtract(blk(-Ht, -Ht, Zt - 1700, Ht, Ht, Zt - 280)).color(ore));
  for (const [k, [x, y, r]] of [[-1500, -1300, 520], [700, -1900, 460], [1700, 600, 560], [-600, 1500, 420], [200, -200, 380]].entries()) {
    add(`boulder-${k}`, sphere(r).scale([1.2, 1, 0.8]).translate(x, y, Zt + 560 + 0.6 * r).color(k % 2 ? oreDark : ore));
  }
}

// ---- Retaining wall, tipping deck, bump block (+X) ----
const Xw = C + 400;
add('retaining-wall', blk(Xw, -C - 1200, 0, Xw + 900, C + 1200, Zt + 100).color(concrete));
add('tipping-deck', blk(Xw + 900, -C - 1200, Zt - 300, Xw + 5000, C + 1200, Zt + 100).color(concrete));
add('deck-fill', blk(Xw + 900, -C - 1200, 0, Xw + 5000, C + 1200, Zt - 300).color(concrete));
add('bump-block', blk(Xw + 900, -C + 200, Zt + 100, Xw + 1900, C - 200, Zt + 1000).color(concrete));
for (let i = 0; i < 5; i++) {
  const y = -C + 200 + ((2 * C - 400) * i) / 5;
  add(`bump-stripe-${i}`, blk(Xw + 880, y, Zt + 820, Xw + 1920, y + (2 * C - 400) / 10, Zt + 1010).color(warn));
}
add('wall-coping', blk(Ht + 100, -C - 1200, Zt, Xw + 900, C + 1200, Zt + 100).subtract(blk(Ht + 60, -Ht - 100, Zt - 10, Xw + 10, Ht + 100, Zt + 110)).color(wear));

// ---- Tipping signal and spray bar ----
const sx = Xw + 2400, sy = -C - 900;
add('signal-pole', rod(90, Zt + 100, Zt + 4200, 8).translate(sx, sy, 0).color(structuralSteel));
add('signal-head', blk(sx - 260, sy - 220, Zt + 3000, sx + 260, sy + 220, Zt + 4300).color(dark));
add('signal-red', rod(160, 0, 60, 12).rotateY(-90).translate(sx - 260, sy, Zt + 3950).color(red));
add('signal-green', rod(160, 0, 60, 12).rotateY(-90).translate(sx - 260, sy, Zt + 3350).color(green));
add('spray-bar', tube([-Ht - 150, -Ht - 150, Zt + 200], [Ht + 150, -Ht - 150, Zt + 200], 50, 6).color(warn));
for (let i = 0; i < 5; i++) {
  const x = -Ht + 300 + (i * (2 * Ht - 600)) / 4;
  add(`spray-nozzle-${i}`, blk(x - 60, -Ht - 210, Zt + 120, x + 60, -Ht - 90, Zt + 260).color(dark));
}

return p.model();
