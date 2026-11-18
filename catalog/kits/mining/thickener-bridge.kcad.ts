// SPDX-License-Identifier: CC0-1.0
// Tailings thickener, the wide shallow settling tank that turns dilute
// tailings into a dense underflow and returns clear water to the plant. What
// makes it one: a large low round tank on a ring of short columns with a
// conical floor, a calm water surface with an overflow weir and launder round
// the rim, a feedwell in the centre fed by a pipe along the bridge, a trussed
// bridge from the rim to a central drive head (gearbox and motors) that turns
// the rake arms, and the underflow cone and pump below the tank centre.
// Millimetres, Z up, tank centre at the origin, bridge along +X.
meta({
  name: "thickener-bridge",
  license: 'CC0-1.0',
  title: "Tailings thickener bridge",
  description: "Bridge-type tailings thickener at about real size: 22 m elevated steel tank on a ring of columns with a conical floor and underflow cone, settled water surface with a notched overflow weir and external launder discharging to an overflow box, centre feedwell fed by a pipe carried along a trussed walkway bridge with handrails, central drive head with gearbox, twin motors and rake-lift cylinder, rake-arm crossbar showing at the surface, underflow pump and pipe under the centre. Material controls: tank coating, bridge and column steel, drive coating, process water colour, plus a bridge choice (half, full). weathered, highVisibility and clearWater presets.",
  tags: ['mining', 'mineral processing', 'tailings', 'thickener', 'clarifier', 'dewatering', 'rake drive', 'bridge'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#bcc4c4', { label: 'Tank coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Bridge and column steel' });
const driveCoating = param('driveCoating', '#2f6f9e', { label: 'Drive head coating' });
const water = param('water', '#4b7466', { label: 'Process water' });
const span = param('span', 'half', { choices: ['half', 'full'], label: 'Bridge span' });
presets({
  weathered: { coatedSteel: '#7b8180', structuralSteel: '#666a66', driveCoating: '#5d6f73', water: '#706a55' },
  highVisibility: { coatedSteel: '#c9cfcf', structuralSteel: '#465159', driveCoating: '#e48a1e', water: '#5f7a72' },
  clearWater: { coatedSteel: '#a9b5b8', structuralSteel: '#2f5a8a', driveCoating: '#2f5a8a', water: '#4f8399' },
});

const p = assembly("thickener-bridge");
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
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const dark = '#26292b', concrete = '#a6a196', rail = '#e8c21a', rubber = '#1f2224', foam = '#c9c6b8';
const R = 11000; // tank radius
const N = 40;
const Zf = 3600; // floor level at the wall
const Zw = Zf + 4200; // top of the wall
const Zs = Zw - 250; // water surface

add('ground-slab', blk(-13500, -13500, 0, 15500, 13500, 150).color(concrete));

// ---- Tank on its column ring ----
add('tank-wall', rod(R, Zf, Zw, N).subtract(rod(R - 200, Zf + 10, Zw + 10, N)).color(coatedSteel));
add('tank-cone', lathe([[1200, Zf - 2400], [R, Zf]], N).color(coatedSteel));
add('underflow-cone', lathe([[500, 1500], [1200, Zf - 2400]], 12).color(coatedSteel));
for (let k = 0; k < 4; k++) add(`wall-ring-${k}`, rod(R + 60, Zf + 900 * k + 300, Zf + 900 * k + 420, N).color(coatedSteel));
for (let k = 0; k < 12; k++) {
  const a = (2 * Math.PI * k) / 12, x = (R - 400) * Math.cos(a), y = (R - 400) * Math.sin(a);
  add(`column-${k}`, rod(260, 150, Zf, 8).translate(x, y, 0).color(structuralSteel));
  add(`column-footing-${k}`, blk(x - 600, y - 600, 150, x + 600, y + 600, 450).color(concrete));
}
for (let k = 0; k < 6; k++) {
  const a = (2 * Math.PI * k) / 6, x = 5500 * Math.cos(a), y = 5500 * Math.sin(a);
  add(`inner-column-${k}`, rod(220, 150, Zf - 1200, 8).translate(x, y, 0).color(structuralSteel));
}
for (let k = 0; k < 12; k++) {
  const a0 = (2 * Math.PI * k) / 12, a1 = (2 * Math.PI * (k + 1)) / 12, r = R - 400;
  add(`column-brace-${k}`, tube([r * Math.cos(a0), r * Math.sin(a0), 600], [r * Math.cos(a1), r * Math.sin(a1), Zf - 300], 70, 4).color(structuralSteel));
}

// ---- Water surface, overflow weir and launder ----
add('water-surface', rod(R - 80, Zs - 200, Zs, N).color(water));
add('overflow-weir', rod(R - 60, Zs, Zs + 120, N).subtract(rod(R - 220, Zs - 10, Zs + 130, N)).color(structuralSteel));
add('launder', rod(R + 900, Zw - 700, Zw, N).subtract(rod(R + 750, Zw - 550, Zw + 10, N)).color(coatedSteel));
add('launder-water', rod(R + 750, Zw - 400, Zw - 330, N).color(water));
add('overflow-box', blk(-R - 2400, -1000, 150, -R - 600, 1000, Zw - 500).color(coatedSteel));
add('overflow-pipe', tube([-R - 1500, 0, 1500], [-R - 1500, 7000, 1500], 380, 10).color(dark));
// Scum and froth lines show where the settling zone meets the clear water.
add('feedwell-froth', rod(2700, Zs, Zs + 60, 20).color(foam));

// ---- Centre feedwell and drive head ----
add('feedwell', rod(2600, Zs - 1800, Zs + 700, 20).subtract(rod(2450, Zs - 1810, Zs + 710, 20)).color(coatedSteel));
add('drive-platform', blk(-2200, -2200, Zw + 500, 2200, 2200, Zw + 700).color(structuralSteel));
add('drive-cage', rod(1700, Zw + 700, Zw + 1400, 16).color(driveCoating));
add('drive-gear-ring', rod(1850, Zw + 1100, Zw + 1250, 24).color(dark));
add('drive-cap', lathe([[1200, Zw + 1400], [900, Zw + 1900], [400, Zw + 2200]], 16).color(driveCoating));
for (const [k, a] of [45, 225].entries()) {
  const t = (a * Math.PI) / 180, x = 1500 * Math.cos(t), y = 1500 * Math.sin(t);
  add(`drive-gearbox-${k}`, rod(380, Zw + 700, Zw + 1500, 12).translate(x, y, 0).color(driveCoating));
  add(`drive-motor-${k}`, rod(320, Zw + 1500, Zw + 2400, 14).translate(x, y, 0).color(structuralSteel));
  add(`drive-motor-cowl-${k}`, lathe([[300, Zw + 2400], [200, Zw + 2550]], 12).translate(x, y, 0).color(dark));
}
add('rake-lift-cylinder', rod(260, Zw + 1900, Zw + 3100, 10).color(driveCoating));
add('rake-lift-rod', rod(110, Zw + 3100, Zw + 3600, 8).color('#b5c0c0'));
add('drive-control-box', blk(-2100, 1200, Zw + 700, -1500, 2000, Zw + 1900).color(structuralSteel));
add('centre-column', rod(700, Zf - 2400, Zw + 500, 12).color(structuralSteel));
// Rake arms showing just above the surface as a crossbar and its tie rods.
add('rake-crossbar', blk(-9500, -200, Zs - 60, 9500, 200, Zs + 80).rotateZ(30).color(dark));
for (const s of [-1, 1]) {
  const c = Math.cos(Math.PI / 6) * s, d = Math.sin(Math.PI / 6) * s;
  add(`rake-tie-${s}`, tube([c * 800, d * 800, Zw + 500], [c * 7000, d * 7000, Zs + 80], 60, 6).color(dark));
}

// ---- Bridge, walkway and feed pipe ----
const xs = span.value === 'full' ? -R - 300 : -2200;
const bz = Zw + 500;
add('bridge-deck', blk(xs, -900, bz - 80, R + 300, 900, bz).color(structuralSteel));
for (const y of [-900, 900]) {
  add(`bridge-chord-bottom-${y}`, blk(xs, y - 120, bz - 1500, R + 300, y + 120, bz - 1300).color(structuralSteel));
  const nb = Math.round((R + 300 - xs) / 1800);
  for (let k = 0; k < nb; k++) {
    const x0 = xs + ((R + 300 - xs) * k) / nb, x1 = xs + ((R + 300 - xs) * (k + 1)) / nb;
    add(`bridge-diag-${y}-${k}`, tube([x0, y, k % 2 ? bz - 80 : bz - 1300], [x1, y, k % 2 ? bz - 1300 : bz - 80], 60, 4).color(structuralSteel));
  }
  for (let x = xs + 200; x <= R + 200; x += 1600) add(`bridge-post-${y}-${x}`, rod(25, bz, bz + 1100, 6).translate(x, y, 0).color(rail));
  add(`bridge-rail-top-${y}`, tube([xs + 200, y, bz + 1100], [R + 200, y, bz + 1100], 25, 6).color(rail));
  add(`bridge-rail-mid-${y}`, tube([xs + 200, y, bz + 550], [R + 200, y, bz + 550], 20, 6).color(rail));
}
add('bridge-rim-support', blk(R - 600, -1200, Zw, R + 400, 1200, bz - 80).color(structuralSteel));
if (span.value === 'full') add('bridge-rim-support-far', blk(-R - 400, -1200, Zw, -R + 600, 1200, bz - 80).color(structuralSteel));
add('feed-pipe', tube([R + 3000, 1300, bz + 300], [1500, 1300, bz + 300], 330, 10).color(rubber));
add('feed-pipe-drop', tube([1500, 1300, bz + 300], [1500, 1300, Zs + 400], 330, 10).color(rubber));
add('feed-pipe-riser', tube([R + 3000, 1300, 160], [R + 3000, 1300, bz + 300], 330, 10).color(rubber));
// Access stair from ground to the rim end of the bridge.
for (let k = 0; k < 18; k++) {
  const z = 150 + ((bz - 230) * (k + 1)) / 19, x = R + 3900, y = -9000 + 470 * k;
  add(`stair-tread-${k}`, blk(x - 500, y, z - 40, x + 500, y + 300, z).color(structuralSteel));
}
add('stair-landing', blk(R + 300, -1000, bz - 80, R + 4400, 1000, bz).color(structuralSteel));
add('stair-stringer', tube([R + 3400, -9200, 200], [R + 3400, -500, bz - 80], 70, 4).color(structuralSteel));

// ---- Underflow pump and pipe ----
add('underflow-pump-plinth', blk(1500, -1200, 150, 4800, 1200, 600).color(concrete));
add('underflow-pump', rod(700, -250, 250, 16).rotateX(90).translate(2400, 0, 1300).color(driveCoating));
add('underflow-motor', blk(3200, -500, 600, 4600, 500, 1700).color(structuralSteel));
add('underflow-spool', tube([0, 0, 1500], [2400, 0, 1500], 300, 10).color(rubber));
add('underflow-discharge', tube([2400, -500, 1900], [2400, -500, 3200], 260, 10).color(rubber));
add('underflow-line', tube([2400, -500, 3200], [7000, -9000, 3200], 260, 10).color(rubber));

return p.model();
