// Ground-mount PV rack: a fixed-tilt solar table standing in a field.
// What makes it one rather than a tilted slab: two rows of portrait framed
// modules (aluminium frame, dark glass, white cell gaps showing the 6 x 10 cell
// grid and the half-cut split) clamped onto lipped C-section purlins, which sit
// on sloping rafters carried by a short front and a tall rear galvanized
// I-section post per frame, each post driven into a concrete footing, with a
// diagonal brace triangulating every frame.
// Generic visualization geometry at real size (1134 x 1722 mm modules, about
// 0.6 m ground clearance at the low edge), millimetres, Z up, footings on z = 0.
meta({
  name: 'ground-mount-pv-rack',
  license: 'CC0-1.0',
  title: 'Ground-mount PV rack',
  description: 'Fixed-tilt ground-mount solar table at real size: two rows of portrait framed PV modules with visible cell grid, clamped to lipped C-section purlins on sloping rafters, carried by short front and tall rear galvanized I-section posts on concrete footings with diagonal braces. Tilt choice (20-35 degrees) and column choice (2-4 modules per row). Material controls: frame aluminium, solar glass, cell gaps, galvanized steel, concrete; fieldService, blackModules and weathered presets.',
  tags: ['ground mount', 'solar rack', 'fixed tilt', 'PV array', 'photovoltaic', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 2600
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const tilt = param('tilt', '25deg', { choices: ['20deg', '25deg', '30deg', '35deg'], label: 'Tilt angle' });
const columns = param('columns', '2', { choices: ['2', '3', '4'], label: 'Modules per row' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Module frame aluminium' });
const solarGlass = param('solarGlass', '#1f3f5e', { label: 'Solar glass' });
const cellGap = param('cellGap', '#d9dee2', { label: 'Cell gaps and busbars' });
const galvanizedSteel = param('galvanizedSteel', '#8a9497', { label: 'Galvanized posts, rafters and purlins' });
const concrete = param('concrete', '#a9a59c', { label: 'Concrete footings' });
presets({
  fieldService: { aluminum: '#a9b5b9', solarGlass: '#1e4668', galvanizedSteel: '#68787b', concrete: '#9c978d' },
  blackModules: { aluminum: '#24282b', solarGlass: '#14181d', cellGap: '#2c3238' },
  weathered: { aluminum: '#a39f93', solarGlass: '#3b5161', cellGap: '#c4c2b6', galvanizedSteel: '#7c7a70', concrete: '#8f8a7e' },
});

const p = assembly('ground-mount-pv-rack');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Table geometry. The deck is authored flat in (x, v, w) — v up the slope, w
// out of the module face — then tilted about X and lifted into place.
const T = { '20deg': 20, '25deg': 25, '30deg': 30, '35deg': 35 }[tilt.value];
const N = Number(columns.value);
const MW = 1134;
const ML = 1722;
const GAP = 20;
const L = 2 * ML + GAP;
const W = N * MW + (N - 1) * GAP;
const Z0 = 600;
const rad = (T * Math.PI) / 180;
const Y0 = (-L * Math.cos(rad)) / 2;
const deck = (shape) => shape.rotateX(T).translate(0, Y0, Z0);
const addDeck = (name, shape, colour) => add(name, deck(shape).color(colour));
const world = (v, w) => [v * Math.cos(rad) - w * Math.sin(rad) + Y0, v * Math.sin(rad) + w * Math.cos(rad) + Z0];

// Modules: frame bars, glass, cell-column gaps and the half-cut split line.
for (let row = 0; row < 2; row += 1) {
  for (let col = 0; col < N; col += 1) {
    const k = `${row}-${col}`;
    const cx = -W / 2 + MW / 2 + col * (MW + GAP);
    const cv = ML / 2 + row * (ML + GAP);
    for (const s of [-1, 1]) {
      addDeck(`module-${k}-frame-side-${s < 0 ? 'l' : 'r'}`, box(32, ML, 35, true).translate(cx + s * (MW / 2 - 16), cv, 17.5), aluminum);
      addDeck(`module-${k}-frame-end-${s < 0 ? 'lo' : 'hi'}`, box(MW - 64, 32, 35, true).translate(cx, cv + s * (ML / 2 - 16), 17.5), aluminum);
    }
    addDeck(`module-${k}-glass`, box(MW - 64, ML - 64, 6, true).translate(cx, cv, 30), solarGlass);
    for (let c = 1; c < 6; c += 1) {
      addDeck(`module-${k}-cell-gap-${c}`, box(5, ML - 90, 1, true).translate(cx - (MW - 64) / 2 + (c * (MW - 64)) / 6, cv, 33.5), cellGap);
    }
    addDeck(`module-${k}-split`, box(MW - 90, 8, 1, true).translate(cx, cv, 33.5), cellGap);
  }
}

// Lipped C-section purlins, two under each module row at the quarter points.
const CSEC = [[-25, -100], [25, -100], [25, -82], [20, -82], [20, -88], [-13, -88], [-13, -12], [20, -12], [20, -18], [25, -18], [25, 0], [-25, 0]];
const PURLIN_V = [ML * 0.2, ML * 0.8, ML + GAP + ML * 0.2, ML + GAP + ML * 0.8];
PURLIN_V.forEach((v, i) => {
  addDeck(`purlin-${i}`, alongX(CSEC.map(([y, z]) => [y + v, z]), -W / 2 - 80, W + 160), galvanizedSteel);
});

// Frames: rafter, front and rear I-section posts, footings and a diagonal brace.
const FRAMES = N === 2 ? 2 : N === 3 ? 3 : 4;
const IBEAM = [[-50, -60], [50, -60], [50, -50], [6, -50], [6, 50], [50, 50], [50, 60], [-50, 60], [-50, 50], [-6, 50], [-6, -50], [-50, -50]];
for (let f = 0; f < FRAMES; f += 1) {
  const x = -W / 2 + 450 + (f * (W - 900)) / (FRAMES - 1);
  addDeck(`rafter-${f}`, box(90, L + 200, 140, true).translate(x, L / 2, -170), galvanizedSteel);
  const legs = [];
  for (const [k, v] of [['front', L * 0.18], ['rear', L * 0.82]]) {
    const [y, z] = world(v, -240);
    legs.push([y, z]);
    add(`post-${f}-${k}`, extrudePolygon(IBEAM, z + 40).translate(x, y, 0).color(galvanizedSteel));
    add(`footing-${f}-${k}`, cylinder(120, 170, 12).translate(x, y, 0).color(concrete));
  }
  add(`brace-${f}`, rod([x + 55, legs[0][0], legs[0][1] - 80], [x + 55, legs[1][0], 260], 22, 6).color(galvanizedSteel));
}

return p.model();
