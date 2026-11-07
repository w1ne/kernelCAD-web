// SPDX-License-Identifier: CC0-1.0
// Circular secondary clarifier, the round settling tank of a treatment works.
// What makes it one: a wide, shallow concrete tank with a still water surface;
// a centre column carrying the scraper drive, with a stainless inlet feed well
// round it; a half-bridge walkway running from the rim to the drive; a
// rotating skimmer arm sweeping floating scum into a scum box at the wall; and
// an inboard effluent launder with a weir plate and scum baffle just inside
// the wall, discharging through an outlet box. Handrail round the rim and a
// stair up to the bridge landing.
// Millimetres, Z up, tank centred on the origin, bridge along +X.
meta({
  name: "circular-clarifier",
  license: 'CC0-1.0',
  title: "Circular clarifier tank",
  description: "Circular secondary clarifier at about real size: 18 m concrete tank on an apron slab with a still water surface, inboard effluent launder with stainless weir plate and scum baffle, centre column with stainless inlet feed well, scraper drive gearbox and motor on a square drive platform, half-bridge truss walkway with grating and handrails from the rim to the drive, rotating surface skimmer arm and scum box, rim handrail, stair and landing, and an outlet box with effluent pipe. Material controls: concrete, bridge and drive steel, stainless and handrail, water; weathered, highVisibility and algaeBloom presets.",
  tags: ['water treatment', 'wastewater', 'clarifier', 'settling tank', 'scraper bridge', 'weir', 'infrastructure'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 6600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const structuralSteel = param('structuralSteel', '#3f6f8f', { label: 'Bridge and drive steel' });
const stainlessSteel = param('stainlessSteel', '#c3cbcc', { label: 'Stainless steel and handrail' });
const water = param('water', '#4f7f86', { label: 'Water surface' });
presets({
  weathered: { concrete: '#9b9587', structuralSteel: '#5d6a70', stainlessSteel: '#a3aaa8', water: '#5d746a' },
  highVisibility: { concrete: '#cfc6b4', structuralSteel: '#e2b01f', stainlessSteel: '#e8e6dc', water: '#3d7f93' },
  algaeBloom: { concrete: '#a9a493', structuralSteel: '#2f5b46', stainlessSteel: '#b7bdb6', water: '#5f7d3d' },
});

const p = assembly("circular-clarifier");
// Lifted so the lowest point (below-grade slab or water line) sits on z = 0.
const add = (name, shape) => p.part(name, shape.translate(0, 0, 150).scale(scale));

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
// Annular wall built from n straight panels between radii r0 and r1.
const ring = (name, r0, r1, z0, z1, n, colour, skip = () => false) => {
  const w = ((2 * Math.PI * r1) / n) * 1.03;
  for (let i = 0; i < n; i++) {
    const a = (360 * i) / n;
    if (skip(a)) continue;
    add(`${name}-${i}`, blk(r0, -w / 2, z0, r1, w / 2, z1).rotateZ(a).color(colour));
  }
};

const R = 9000, T = 300, H = 4200; // tank inner radius, wall, wall top
const WL = 3950; // water level
const dark = '#2a2e30', scum = '#8c7f5e';

// ---- Tank, apron and water ----
add('apron-slab', lathe([[R + 1300, -150], [R + 1300, 0]], 32).color(concrete));
ring('tank-wall', R, R + T, 0, H, 40, concrete);
ring('wall-coping', R - 40, R + T + 60, H, H + 80, 40, concrete);
add('water-surface', lathe([[R + 20, WL - 60], [R + 20, WL]], 40).color(water));
// Inboard effluent launder: a trough wall inside the tank wall, weir plate and scum baffle.
const RL = 8300;
ring('launder-wall', RL - 160, RL, WL - 600, WL + 120, 36, concrete);
ring('weir-plate', RL - 200, RL - 160, WL - 40, WL + 200, 36, stainlessSteel);
ring('scum-baffle', RL - 700, RL - 660, WL - 350, WL + 180, 36, stainlessSteel);
for (let i = 0; i < 12; i++) {
  const a = (360 * i) / 12 + 15;
  add(`baffle-bracket-${i}`, blk(RL - 700, -40, WL + 120, RL - 160, 40, WL + 180).rotateZ(a).color(stainlessSteel));
}
// Outlet box on the -X side with the effluent pipe.
add('outlet-box', blk(-R - T - 1500, -900, 0, -R - T, 900, H).color(concrete));
add('outlet-box-cover', blk(-R - T - 1550, -950, H, -R - T + 50, 950, H + 60).color(stainlessSteel));
add('effluent-pipe', latheX([[420, -R - 5200], [420, -R - T - 1500]], 0, 700, 14).color(structuralSteel));
add('effluent-pipe-flange', latheX([[540, -R - T - 1700], [540, -R - T - 1500]], 0, 700, 14).color(structuralSteel));

// ---- Centre column, feed well and drive ----
add('centre-column', rod(650, 0, H + 350, 14).color(concrete));
add('feed-well', lathe([[2000, WL - 1400], [2000, WL + 220], [2060, WL + 260], [2060, WL + 300]], 24).color(stainlessSteel));
for (let i = 0; i < 4; i++) {
  const a = (Math.PI / 2) * i + Math.PI / 4;
  add(`feed-well-hanger-${i}`, tube([650 * Math.cos(a), 650 * Math.sin(a), H + 300], [1950 * Math.cos(a), 1950 * Math.sin(a), WL + 260], 50, 4).color(structuralSteel));
}
add('drive-platform', blk(-1600, -1600, H + 350, 1600, 1600, H + 450).color(structuralSteel));
add('drive-ring-gear', lathe([[1150, H + 450], [1150, H + 700], [950, H + 760]], 20).color(structuralSteel));
add('drive-gearbox', blk(700, -500, H + 450, 1500, 500, H + 1150).color(structuralSteel));
add('drive-motor', latheX([[300, 1500], [320, 1600], [320, 2350], [260, 2450]], 0, H + 850, 12).color(structuralSteel));
add('drive-motor-cowl', latheX([[250, 2450], [200, 2550]], 0, H + 850, 12).color(dark));
add('drive-terminal-box', blk(1750, -460, H + 900, 2150, -300, H + 1180).color(dark));
// Platform handrail round the drive.
for (const [k, [x, y]] of [[-1550, -1550], [-1550, 1550], [1550, -1550], [1550, 1550], [0, -1550], [0, 1550], [-1550, 0]].entries()) {
  add(`drive-rail-post-${k}`, rod(30, H + 450, H + 1550, 6).translate(x, y, 0).color(stainlessSteel));
}
for (const [k, [a, b]] of [[[-1550, -1550], [1550, -1550]], [[-1550, 1550], [1550, 1550]], [[-1550, -1550], [-1550, 1550]]].entries()) {
  for (const z of [H + 1050, H + 1550]) add(`drive-rail-${k}-${z}`, tube([a[0], a[1], z], [b[0], b[1], z], 25, 6).color(stainlessSteel));
}

// ---- Half bridge from the rim landing to the drive platform ----
const Bz = H + 350, bw = 650; // deck level, half width
for (const s of [-1, 1]) {
  add(`bridge-chord-bottom-${s}`, blk(1600, s * bw - 60, Bz - 650, R + T + 200, s * bw + 60, Bz - 520).color(structuralSteel));
  add(`bridge-chord-top-${s}`, blk(1600, s * bw - 60, Bz - 120, R + T + 200, s * bw + 60, Bz).color(structuralSteel));
  for (let k = 0; k < 8; k++) {
    const x0 = 1600 + k * 975, x1 = x0 + 975;
    add(`bridge-diagonal-${s}-${k}`, tube([x0, s * bw, k % 2 ? Bz - 120 : Bz - 580], [x1, s * bw, k % 2 ? Bz - 580 : Bz - 120], 40, 4).color(structuralSteel));
  }
  // Walkway handrail: posts and two rails.
  for (let k = 0; k <= 8; k++) add(`bridge-rail-post-${s}-${k}`, rod(28, Bz, Bz + 1100, 6).translate(1600 + k * 975, s * (bw + 40), 0).color(stainlessSteel));
  for (const z of [Bz + 550, Bz + 1100]) add(`bridge-rail-${s}-${z}`, tube([1600, s * (bw + 40), z], [R + T + 200, s * (bw + 40), z], 24, 6).color(stainlessSteel));
}
add('bridge-grating', blk(1600, -bw, Bz, R + T + 200, bw, Bz + 50).color(stainlessSteel));
for (let x = 2000; x < R + T; x += 1300) add(`bridge-crossbeam-${x}`, blk(x - 50, -bw, Bz - 650, x + 50, bw, Bz - 520).color(structuralSteel));
// Landing on the rim and stair down the outside of the wall.
add('landing', blk(R + T, -1200, H, R + T + 1400, 1200, H + 350).color(structuralSteel));
add('landing-column-a', blk(R + T + 1250, -1150, 0, R + T + 1400, -1000, H).color(structuralSteel));
add('landing-column-b', blk(R + T + 1250, 1000, 0, R + T + 1400, 1150, H).color(structuralSteel));
{
  const steps = 18, run = 260, rise = (H + 350) / steps;
  for (let k = 0; k < steps; k++) {
    const y0 = -1200 - (steps - k) * run;
    add(`stair-tread-${k}`, blk(R + T + 300, y0, (k + 1) * rise - 40, R + T + 1300, y0 + run + 20, (k + 1) * rise).color(stainlessSteel));
  }
  for (const x of [R + T + 280, R + T + 1320]) {
    add(`stair-stringer-${x}`, tube([x, -1200 - steps * run, 0], [x, -1200, H + 350], 60, 4).color(structuralSteel));
    add(`stair-handrail-${x}`, tube([x, -1200 - steps * run, 1000], [x, -1200, H + 1350], 25, 6).color(stainlessSteel));
  }
}

// ---- Rotating skimmer arm and scum box ----
{
  const a = 215, rad = (a * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
  add('skimmer-arm', blk(2100, -40, WL - 250, RL - 750, 40, WL + 150).rotateZ(a).color(structuralSteel));
  add('skimmer-truss', tube([700 * c, 700 * s, H + 300], [(RL - 900) * c, (RL - 900) * s, WL + 150], 55, 4).color(structuralSteel));
  add('skimmer-scum', blk(2100, -400, WL - 10, RL - 750, 0, WL + 30).rotateZ(a).color(scum));
  add('scum-box', blk(RL - 1400, -700, WL - 600, RL - 650, 700, WL + 250).rotateZ(a + 12).color(stainlessSteel));
  add('scum-box-lip', blk(RL - 1450, -720, WL + 250, RL - 1350, 720, WL + 300).rotateZ(a + 12).color(dark));
}

// ---- Rim handrail ----
{
  const n = 28, Rr = R + T - 60;
  for (let i = 0; i < n; i++) {
    const a0 = (2 * Math.PI * i) / n, a1 = (2 * Math.PI * (i + 1)) / n;
    const mid = (a0 + a1) / 2;
    if (Math.abs(Math.atan2(Math.sin(mid), Math.cos(mid))) < 0.16) continue; // gap at the bridge landing
    const p0 = [Rr * Math.cos(a0), Rr * Math.sin(a0)], p1 = [Rr * Math.cos(a1), Rr * Math.sin(a1)];
    add(`rim-rail-post-${i}`, rod(28, H + 80, H + 1180, 6).translate(p0[0], p0[1], 0).color(stainlessSteel));
    add(`rim-rail-top-${i}`, tube([p0[0], p0[1], H + 1180], [p1[0], p1[1], H + 1180], 24, 6).color(stainlessSteel));
    add(`rim-rail-knee-${i}`, tube([p0[0], p0[1], H + 650], [p1[0], p1[1], H + 650], 20, 6).color(stainlessSteel));
  }
}

return p.model();
