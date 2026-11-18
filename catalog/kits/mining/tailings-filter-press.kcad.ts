// SPDX-License-Identifier: CC0-1.0
// Tailings filter press, the plate-and-frame press that squeezes tailings
// slurry into a stackable cake. What makes it one: a long pack of square
// polypropylene filter plates hung between two side bars, a heavy fixed head
// at the feed end with the feed pipe and filtrate manifolds, a moving head
// pushed by a big hydraulic closing cylinder held in a rear cylinder head,
// a plate-shifter carriage running on the side bar, drip-tray doors under the
// pack, all raised on a steel structure over a concrete cake bay where the
// discharged cake piles up.
// Millimetres, Z up, press axis along X with the feed end at -X, ground origin
// under the middle of the plate pack.
meta({
  name: "tailings-filter-press",
  license: 'CC0-1.0',
  title: "Tailings filter press",
  description: "Sidebar plate-and-frame tailings filter press at about real size: pack of 2 m square polypropylene filter plates hung on twin side bars, fixed feed head with feed pipe and filtrate manifolds, moving head driven by a hydraulic closing cylinder in a rear cylinder head with power pack, plate-shifter carriage, drip-tray doors, raised on a steel structure with walkways and handrails over a concrete cake bay holding a pile of discharged cake. Material controls: press frame coating, structure and walkway steel, filter plate polypropylene, cake bay concrete, plus a cycle choice (filtering, discharging). weathered, highVisibility and whitePlates presets.",
  tags: ['mining', 'mineral processing', 'tailings', 'filter press', 'dewatering', 'dry stack', 'filtration', 'concentrator'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 3800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#2f6f9e', { label: 'Press frame coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Structure and walkway steel' });
const polypropylene = param('polypropylene', '#9aa4ab', { label: 'Filter plate polypropylene' });
const concrete = param('concrete', '#a6a196', { label: 'Cake bay concrete' });
const cycle = param('cycle', 'filtering', { choices: ['filtering', 'discharging'], label: 'Press cycle' });
presets({
  weathered: { coatedSteel: '#5d6f73', structuralSteel: '#666a66', polypropylene: '#8a8f8e', concrete: '#8b8579' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', polypropylene: '#5f6a72', concrete: '#b3afa6' },
  whitePlates: { coatedSteel: '#2f5a8a', structuralSteel: '#3e4549', polypropylene: '#e3e3dc', concrete: '#aaa59b' },
});

const p = assembly("tailings-filter-press");
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

const dark = '#26292b', cake = '#8a7a62', cakeDark = '#6f624f', rubber = '#1f2224', rail = '#e8c21a', chrome = '#c5ccca';
const open = cycle.value === 'discharging';
const Zf = 4200; // top of the support structure (press floor)
const Zc = Zf + 1700; // press axis
const S = 2000; // plate size
const W = 1500; // side-bar half spacing
const X0 = -6000, X1 = 6200; // fixed head face, cylinder head face

// ---- Cake bay and support structure ----
add('cake-bay-floor', blk(-8600, -5600, 0, 9400, 5000, 200).color(concrete));
add('cake-bay-wall-back', blk(-8600, 4400, 200, 9400, 5000, 2600).color(concrete));
add('cake-bay-wall-l', blk(-8600, -5600, 200, -8000, 4400, 2600).color(concrete));
add('cake-bay-wall-r', blk(8800, -5600, 200, 9400, 4400, 2600).color(concrete));
add('cake-pile', lathe([[3600, 200], [2400, 1300], [700, 2300]], 12).translate(-500, 0, 0).color(cake));
add('cake-pile-b', lathe([[2600, 200], [1500, 1100], [400, 1800]], 10).translate(3800, -300, 0).color(cakeDark));
for (const x of [-7600, -2600, 2600, 7600]) {
  for (const y of [-3800, 3800]) add(`column-${x}-${y}`, blk(x - 200, y - 200, 200, x + 200, y + 200, Zf - 400).color(structuralSteel));
}
for (const y of [-3800, 3800]) add(`girder-${y}`, blk(-7900, y - 250, Zf - 400, 7900, y + 250, Zf).color(structuralSteel));
add('press-beam-a', blk(-7900, -W - 300, Zf - 400, 7900, -W + 300, Zf).color(structuralSteel));
add('press-beam-b', blk(-7900, W - 300, Zf - 400, 7900, W + 300, Zf).color(structuralSteel));
for (const x of [-7600, 7600]) add(`cross-girder-${x}`, blk(x - 250, -3800, Zf - 400, x + 250, 3800, Zf).color(structuralSteel));

// ---- Walkways each side with handrails ----
for (const s of [-1, 1]) {
  const y0 = s * 2800, y1 = s * 4200;
  add(`walkway-${s}`, blk(-7900, Math.min(y0, y1), Zf - 60, 7900, Math.max(y0, y1), Zf).color(structuralSteel));
  for (let x = -7800; x <= 7800; x += 1950) add(`handrail-post-${s}-${x}`, rod(25, Zf, Zf + 1100, 6).translate(x, y1, 0).color(rail));
  add(`handrail-top-${s}`, tube([-7800, y1, Zf + 1100], [7800, y1, Zf + 1100], 25, 6).color(rail));
  add(`handrail-mid-${s}`, tube([-7800, y1, Zf + 550], [7800, y1, Zf + 550], 20, 6).color(rail));
}
// Stair from the cake bay floor up to the -Y walkway.
for (let k = 0; k < 14; k++) {
  const z = 200 + ((Zf - 260) * (k + 1)) / 15, x = -7600 + 280 * k;
  add(`stair-tread-${k}`, blk(x, -5400, z - 40, x + 300, -4300, z).color(structuralSteel));
}
add('stair-landing', blk(-3700, -5400, Zf - 60, -2900, -4200, Zf).color(structuralSteel));
add('stair-stringer', tube([-7700, -5400, 250], [-3700, -5400, Zf - 60], 60, 4).color(structuralSteel));

// ---- Fixed head, cylinder head and side bars ----
add('fixed-head', blk(X0 - 700, -S / 2 - 500, Zf, X0, S / 2 + 500, Zc + S / 2 + 400).color(coatedSteel));
add('fixed-head-rib', blk(X0 - 900, -300, Zf, X0 - 700, 300, Zc + S / 2 + 200).color(coatedSteel));
add('cylinder-head', blk(X1, -S / 2 - 500, Zf, X1 + 600, S / 2 + 500, Zc + S / 2 + 400).color(coatedSteel));
for (const y of [-W, W]) {
  add(`side-bar-${y}`, blk(X0, y - 120, Zc + S / 2 - 100, X1, y + 120, Zc + S / 2 + 200).color(coatedSteel));
  add(`side-bar-rail-${y}`, blk(X0, y - 60, Zc + S / 2 + 200, X1, y + 60, Zc + S / 2 + 260).color(chrome));
}

// ---- Hydraulic closing cylinder and power pack ----
const mh = open ? 3900 : 2600; // moving head face (pack runs from the fixed head to here)
add('closing-cylinder', latheX([[420, X1 - 1700], [420, X1]], 0, Zc, 16).color(coatedSteel));
add('closing-ram', latheX([[260, mh + 400], [260, X1 - 1700]], 0, Zc, 14).color(chrome));
add('moving-head', blk(mh, -S / 2 - 250, Zc - S / 2 - 150, mh + 400, S / 2 + 250, Zc + S / 2 + 150).color(coatedSteel));
for (const y of [-W, W]) add(`moving-head-roller-${y}`, blk(mh + 50, y - 160, Zc + S / 2 + 150, mh + 350, y + 160, Zc + S / 2 + 300).color(dark));
add('power-pack', blk(X1 + 800, -1400, Zf, X1 + 2200, 300, Zf + 1300).color(structuralSteel));
add('power-pack-tank', blk(X1 + 850, -1350, Zf + 1300, X1 + 2150, 250, Zf + 1500).color(coatedSteel));
add('power-pack-motor', rod(260, Zf + 1500, Zf + 2200, 12).translate(X1 + 1500, -600, 0).color(structuralSteel));
add('hydraulic-hose', tube([X1 + 800, -600, Zf + 900], [X1 + 300, -900, Zc - 300], 40, 6).color(rubber));

// ---- Plate pack: closed between the heads, or shifted open with cake dropping ----
const pitch = 70, gap = 8;
if (!open) {
  const n = Math.floor((mh - X0) / pitch);
  for (let k = 0; k < n; k++) {
    const x = X0 + k * pitch;
    add(`plate-${k}`, blk(x + gap / 2, -S / 2, Zc - S / 2, x + pitch - gap / 2, S / 2, Zc + S / 2).color(polypropylene));
  }
  for (const y of [-S / 2 - 70, S / 2 + 70]) {
    add(`plate-handles-${y}`, blk(X0, y - 70, Zc + S / 2 - 220, mh, y + 70, Zc + S / 2 - 120).color(dark));
  }
  add('drip-tray-a', blk(X0, -1300, Zc - S / 2 - 450, mh, -40, Zc - S / 2 - 380).rotateX(-12).color(structuralSteel));
  add('drip-tray-b', blk(X0, 40, Zc - S / 2 - 450, mh, 1300, Zc - S / 2 - 380).rotateX(12).color(structuralSteel));
} else {
  // Plates stacked at the moving head and the fixed head, shifter pulling one at a time.
  const nA = 55, nB = 55;
  for (let k = 0; k < nA; k++) {
    const x = X0 + k * pitch;
    add(`plate-${k}`, blk(x + gap / 2, -S / 2, Zc - S / 2, x + pitch - gap / 2, S / 2, Zc + S / 2).color(polypropylene));
  }
  for (let k = 0; k < nB; k++) {
    const x = mh - (k + 1) * pitch;
    add(`plate-b-${k}`, blk(x + gap / 2, -S / 2, Zc - S / 2, x + pitch - gap / 2, S / 2, Zc + S / 2).color(polypropylene));
  }
  const xs = X0 + nA * pitch + 900;
  add('plate-shifted', blk(xs, -S / 2, Zc - S / 2, xs + pitch - gap, S / 2, Zc + S / 2).color(polypropylene));
  add('cake-slab-falling', blk(xs - 300, -S / 2 + 100, Zc - S / 2 - 1600, xs - 240, S / 2 - 100, Zc + S / 2 - 1500).rotateX(6).color(cake));
  add('cake-chunk-a', blk(xs - 500, -600, Zf - 1900, xs - 100, 200, Zf - 1500).rotateY(25).color(cakeDark));
  add('cake-chunk-b', blk(xs - 300, 100, Zf - 2800, xs + 100, 700, Zf - 2400).rotateX(30).color(cake));
}
add('plate-shifter', blk(X0 + 2900 + (open ? 900 : 0), -W - 220, Zc + S / 2 + 260, X0 + 3400 + (open ? 900 : 0), -W + 220, Zc + S / 2 + 560).color(rail));

// ---- Feed pipe and filtrate manifolds at the fixed head ----
add('feed-pipe', latheX([[220, -8400], [220, X0 - 900]], 0, Zc, 14).color(rubber));
add('feed-riser', tube([-8400, 0, 200], [-8400, 0, Zc], 220, 14).color(rubber));
add('feed-valve', latheX([[330, -7700], [330, -7400]], 0, Zc, 14).color(chrome));
for (const [k, [y, z]] of [[-700, Zc + 700], [700, Zc + 700], [-700, Zc - 700], [700, Zc - 700]].entries()) {
  add(`filtrate-port-${k}`, latheX([[110, X0 - 1300], [110, X0 - 700]], y, z, 8).color(chrome));
}
add('filtrate-manifold', tube([X0 - 1300, -900, Zc - 700], [X0 - 1300, 900, Zc - 700], 150, 10).color(structuralSteel));
add('filtrate-drop', tube([X0 - 1300, 900, Zc - 700], [X0 - 1300, 900, Zf + 10], 150, 10).color(structuralSteel));

return p.model();
