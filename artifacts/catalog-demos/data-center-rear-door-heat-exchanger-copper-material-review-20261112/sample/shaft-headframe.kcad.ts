// Mine shaft headframe, the steel tower over a vertical shaft that carries the
// winding sheaves. What makes it one: a braced four-legged tower straddling
// the shaft collar, two inclined back legs leaning towards the winder house to
// take the rope pull, a sheave deck on top with two big spoked sheaves side by
// side, ropes running from the sheaves down into the shaft to a cage and a
// skip and back down to the winder house drums. Millimetres, Z up, shaft
// centred on the origin, winder house towards +X.
meta({
  name: "shaft-headframe",
  license: 'CC0-1.0',
  title: "Mine shaft headframe",
  description: "Steel mine shaft headframe at about real size: 24 m four-legged braced tower over a concrete shaft collar, two inclined back legs with struts, sheave deck with handrails and two 4.4 m spoked winding sheaves on bearing beams, hoist ropes down to a cage at the collar and a skip high in the tower and across to a gabled winder house, and a caged access ladder. Material controls: headframe steel, sheave and rope steel, cage and winder-house cladding, concrete; weathered, highVisibility and redOxide presets.",
  tags: ['mining', 'headframe', 'headgear', 'mine shaft', 'winding sheave', 'hoist', 'winder house', 'cage', 'skip'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#3f6e7a', { label: 'Headframe steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Sheave and rope steel' });
const cladding = param('cladding', '#d9cfb8', { label: 'Cage and winder-house cladding' });
const concrete = param('concrete', '#a19d94', { label: 'Collar concrete' });
presets({
  weathered: { structuralSteel: '#666a66', stainlessSteel: '#969f9e', cladding: '#a99d86', concrete: '#8b8579' },
  highVisibility: { structuralSteel: '#465159', stainlessSteel: '#c5ccca', cladding: '#e48a1e', concrete: '#b3afa6' },
  redOxide: { structuralSteel: '#8e3b2b', stainlessSteel: '#c0c6c4', cladding: '#c9c2b1', concrete: '#9a958b' },
});

const p = assembly("shaft-headframe");
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
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Closed (y, z) side profile extruded along X from x0 to x1.
const sideX = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};
// Round bar from point a to point b.
const tube = (a, b, r, n = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

const dark = '#1b1d1f', roof = '#6e3a2e', glass = '#3a5562';
const H = 24000; // sheave deck level
const lx = 2500, ly = 2000; // tower leg half-spacing
const collarZ = 400;

// ---- Shaft collar ----
add('collar-pad', blk(-5000, -4500, 0, 5000, 4500, collarZ).color(concrete));
add('shaft-opening', blk(-1700, -1400, collarZ - 30, 1700, 1400, collarZ + 10).color(dark));
add('collar-kerb', blk(-1900, -1600, collarZ, 1900, -1400, collarZ + 300).color(concrete));
add('collar-kerb-b', blk(-1900, 1400, collarZ, 1900, 1600, collarZ + 300).color(concrete));

// ---- Four-legged tower with girts and X-bracing ----
const legs = [[-lx, -ly], [lx, -ly], [lx, ly], [-lx, ly]];
for (const [x, y] of legs) {
  add(`tower-leg-${x}-${y}`, blk(x - 200, y - 200, collarZ, x + 200, y + 200, H).color(structuralSteel));
  add(`leg-base-plate-${x}-${y}`, blk(x - 450, y - 450, collarZ, x + 450, y + 450, collarZ + 80).color(structuralSteel));
}
const levels = [collarZ + 3600, 7600, 11600, 15600, 19600, H - 200];
let prev = collarZ + 300;
levels.forEach((z, k) => {
  for (let f = 0; f < 4; f++) {
    const a = legs[f], b = legs[(f + 1) % 4];
    add(`girt-${k}-${f}`, tube([a[0], a[1], z], [b[0], b[1], z], 110, 4).color(structuralSteel));
    add(`brace-a-${k}-${f}`, tube([a[0], a[1], prev], [b[0], b[1], z], 70, 4).color(structuralSteel));
    add(`brace-b-${k}-${f}`, tube([b[0], b[1], prev], [a[0], a[1], z], 70, 4).color(structuralSteel));
  }
  prev = z;
});

// ---- Inclined back legs towards the winder house ----
const bx = 15000;
for (const s of [-1, 1]) {
  const top = [lx, s * ly, H - 1500];
  const foot = [bx, s * (ly + 1200), collarZ];
  add(`back-leg-${s}`, tube(top, foot, 300, 4).color(structuralSteel));
  add(`back-leg-footing-${s}`, blk(bx - 900, s * (ly + 1200) - 900, 0, bx + 900, s * (ly + 1200) + 900, collarZ + 200).color(concrete));
  for (const [k, u] of [0.35, 0.65].entries()) {
    const q = lerp(top, foot, u);
    add(`back-strut-${s}-${k}`, tube([lx, s * ly, q[2]], q, 120, 4).color(structuralSteel));
    add(`back-diag-${s}-${k}`, tube([lx, s * ly, q[2] + 3500], q, 90, 4).color(structuralSteel));
  }
}
add('back-leg-tie', tube([bx * 0.6 + lx * 0.4, -(ly + 700), 9000], [bx * 0.6 + lx * 0.4, ly + 700, 9000], 120, 4).color(structuralSteel));

// ---- Sheave deck, bearing beams and handrails ----
add('sheave-deck', blk(-3200, -2800, H, 3600, 2800, H + 150).color(structuralSteel));
for (const y of [-1950, -250, 250, 1950]) add(`bearing-beam-${y}`, blk(-1200, y - 200, H + 150, 2600, y + 200, H + 750).color(structuralSteel));
const rail = [[-3200, -2800], [3600, -2800], [3600, 2800], [-3200, 2800]];
for (let f = 0; f < 4; f++) {
  const a = rail[f], b = rail[(f + 1) % 4];
  add(`deck-handrail-${f}`, tube([a[0], a[1], H + 1250], [b[0], b[1], H + 1250], 35).color(cladding));
  add(`deck-midrail-${f}`, tube([a[0], a[1], H + 700], [b[0], b[1], H + 700], 28).color(cladding));
  for (let k = 0; k < 4; k++) {
    const q = lerp([a[0], a[1], H + 150], [b[0], b[1], H + 150], k / 4);
    add(`deck-post-${f}-${k}`, rod(35, q[2], H + 1250, 6).translate(q[0], q[1], 0).color(cladding));
  }
}

// ---- Two spoked winding sheaves ----
const sx = 700, sz = H + 2300, sr = 2200;
for (const [k, yc] of [-1100, 1100].entries()) {
  const segs = 22, w = ((2 * Math.PI * sr) / segs) * 1.08;
  for (let i = 0; i < segs; i++) {
    add(`sheave-${k}-rim-${i}`, blk(-w / 2, yc - 110, sr - 170, w / 2, yc + 110, sr).rotateY((360 * i) / segs).translate(sx, 0, sz).color(stainlessSteel));
  }
  add(`sheave-${k}-hub`, latheY([[320, yc - 300], [320, yc + 300]], sx, sz, 12).color(stainlessSteel));
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + 0.2;
    add(`sheave-${k}-spoke-${i}`, tube([sx + 300 * Math.cos(a), yc, sz + 300 * Math.sin(a)], [sx + (sr - 150) * Math.cos(a), yc, sz + (sr - 150) * Math.sin(a)], 55).color(stainlessSteel));
  }
  add(`sheave-${k}-plummer-a`, blk(sx - 400, yc - 650, H + 750, sx + 400, yc - 300, sz + 200).color(structuralSteel));
  add(`sheave-${k}-plummer-b`, blk(sx - 400, yc + 300, H + 750, sx + 400, yc + 650, sz + 200).color(structuralSteel));
}
add('sheave-shaft', latheY([[180, -1800], [180, 1800]], sx, sz, 10).color(stainlessSteel));

// ---- Ropes: down the shaft and across to the winder house ----
const drumX = 22500, drumZ = 2800;
const cageTop = collarZ + 3400, skipTop = 16800;
add('rope-cage', rod(30, cageTop, sz, 6).translate(sx - sr + 60, -1100, 0).color(stainlessSteel));
add('rope-skip', rod(30, skipTop, sz, 6).translate(sx - sr + 60, 1100, 0).color(stainlessSteel));
{
  const d = [drumX - sx, drumZ - sz];
  const L = Math.hypot(d[0], d[1]);
  const t = [sx + (sr * -d[1]) / L, sz + (sr * d[0]) / L];
  for (const yc of [-1100, 1100]) add(`rope-to-winder-${yc}`, tube([t[0], yc, t[1]], [drumX, yc, drumZ], 30).color(stainlessSteel));
}

// ---- Cage at the collar and skip high in the tower ----
const cx = sx - sr + 60;
add('cage-body', blk(cx - 900, -1900, collarZ + 300, cx + 900, -300, cageTop - 400).color(cladding));
add('cage-mesh-front', blk(cx - 920, -1700, collarZ + 600, cx - 900, -500, cageTop - 700).color(dark));
add('cage-crosshead', blk(cx - 950, -1950, cageTop - 400, cx + 950, -250, cageTop).color(structuralSteel));
add('skip-body', blk(cx - 800, 400, skipTop - 4200, cx + 800, 1800, skipTop - 300).color(cladding));
add('skip-bail', blk(cx - 850, 350, skipTop - 300, cx + 850, 1850, skipTop).color(structuralSteel));
for (const y of [-2000, 2000]) add(`guide-rail-${y}`, blk(cx - 60, y - 60, collarZ, cx + 60, y + 60, H).color(structuralSteel));

// ---- Gabled winder house with rope openings and drums ----
const wx0 = 20000, wx1 = 30000, wy = 5200, eave = 8000;
add('winder-house-walls', blk(wx0, -wy, 0, wx1, wy, eave).color(cladding));
add('winder-house-roof', sideX([[-wy - 400, eave], [wy + 400, eave], [0, eave + 2600]], wx0 - 300, wx1 + 300).color(roof));
add('winder-plinth', blk(wx0 - 200, -wy - 200, 0, wx1 + 200, wy + 200, 300).color(concrete));
for (const yc of [-1100, 1100]) add(`rope-port-${yc}`, blk(wx0 - 30, yc - 500, drumZ - 600, wx0 + 10, yc + 500, drumZ + 900).color(dark));
add('winder-door', blk(wx0 - 30, -wy + 900, 0, wx0 + 10, -wy + 2700, 3600).color(roof));
for (let x = wx0 + 1500; x < wx1 - 500; x += 2500) add(`winder-window-${x}`, blk(x, -wy - 30, 4500, x + 1400, -wy + 10, 6500).color(glass));
add('winder-ventilator', blk(wx0 + 4000, -600, eave + 2300, wx0 + 6000, 600, eave + 3100).color(roof));

// ---- Caged ladder up the front-left leg ----
const lxL = -lx - 450;
for (const dy of [-ly - 250, -ly + 250]) add(`ladder-stile-${dy}`, rod(30, collarZ, H + 150, 6).translate(lxL, dy, 0).color(cladding));
for (let z = collarZ + 600; z < H; z += 900) add(`ladder-rung-${z}`, blk(lxL - 20, -ly - 250, z, lxL + 20, -ly + 250, z + 40).color(cladding));
for (let z = 3000; z < H; z += 3000) add(`ladder-hoop-${z}`, lathe([[420, z], [420, z + 60]], 8).translate(lxL - 200, -ly, 0).color(cladding));

return p.model();
