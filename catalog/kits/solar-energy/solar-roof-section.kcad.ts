// Solar roof section: a cut-away piece of a pitched house roof with a
// rooftop PV install, the kind shown at a trade stand or in a site plan.
// What makes it one rather than a slab with panels: a real gable — two roof
// slopes on timber rafters with a fascia, barge boards and a ridge cap —
// standing on short rendered walls and covered in standing-seam metal or rows of interlocking tiles, with L-foot
// flashing mounts carrying two aluminium rails, and framed modules (glass,
// cell gaps, half-cut split) held by end and mid clamps on the south slope.
// Generic visualization geometry at real size (about 3.6 m along the ridge),
// millimetres, Z up, walls on z = 0.
meta({
  name: 'solar-roof-section',
  license: 'CC0-1.0',
  title: 'Solar roof section',
  description: 'Pitched roof section with a rooftop PV install at real size: rendered eave and gable walls under a roof of timber rafters, fascia, barge boards and ridge cap, standing-seam or interlocking-tile roofing, L-foot flashing mounts carrying two aluminium rails, and framed PV modules with cell grid held by end and mid clamps. Pitch choice (20-40 degrees) and roofing choice. Material controls: roofing, wall render, timber trim, rail and frame aluminium, solar glass, cell gaps; terracotta, blackModules and weathered presets.',
  tags: ['solar roof', 'rooftop PV', 'pitched roof', 'standing seam', 'roof tiles', 'photovoltaic', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 2000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const pitch = param('pitch', '30deg', { choices: ['20deg', '30deg', '40deg'], label: 'Roof pitch' });
const roofing = param('roofing', 'standingSeam', { choices: ['standingSeam', 'tile'], label: 'Roof covering' });
const roofCover = param('roofCover', '#4f5a60', { label: 'Roofing (metal or tile)' });
const wallRender = param('wallRender', '#d8cfbd', { label: 'Wall render' });
const timberTrim = param('timberTrim', '#e9e6dc', { label: 'Fascia, barge boards and rafters' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Rails, clamps and module frames' });
const solarGlass = param('solarGlass', '#1f3f5e', { label: 'Solar glass' });
const cellGap = param('cellGap', '#d9dee2', { label: 'Cell gaps and busbars' });
presets({
  terracotta: { roofing: 'tile', roofCover: '#b2593a', timberTrim: '#f1ece0', wallRender: '#efe6d2' },
  blackModules: { aluminum: '#24282b', solarGlass: '#14181d', cellGap: '#2c3238', roofCover: '#2f3438' },
  weathered: { wallRender: '#b9ae98', roofCover: '#6b6a5f', timberTrim: '#a8977a', aluminum: '#a39f93', solarGlass: '#3b5161', cellGap: '#c4c2b6' },
});

const p = assembly('solar-roof-section');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);

const P = { '20deg': 20, '30deg': 30, '40deg': 40 }[pitch.value];
const rad = (P * Math.PI) / 180;
const RUN = 1500;                       // eave-to-ridge horizontal run per slope
const RL = RUN / Math.cos(rad) + 150;   // rafter length along the slope, with overhang
const BASE = 700;                       // eave wall height under the roof
const RIDGE_Z = BASE + RUN * Math.tan(rad);
const X = 3600;                         // length along the ridge

// Slope-local frame for the south (-Y) slope: x along the ridge, v down the
// slope from the ridge, w out of the roof surface.
const south = (shape) => shape.rotateX(P).translate(0, 0, RIDGE_Z);
const north = (shape) => shape.rotateX(P).rotateZ(180).translate(0, 0, RIDGE_Z);
// Slope cross-section (y = -v, z = w) extruded along the ridge.
const slab = (v0, v1, w0, w1, x0 = -X / 2, len = X) => alongX([[-v1, w0], [-v0, w0], [-v0, w1], [-v1, w1]], x0, len);

// Short walls under the roof: two eave walls and two gable ends meeting the
// underside of the rafters, so the section stands like the top of a house.
const DROP = 240 / Math.cos(rad);
const EAVE_TOP = RIDGE_Z - RUN * Math.tan(rad) - DROP;
for (const s of [-1, 1]) {
  add(`eave-wall-${s < 0 ? 'south' : 'north'}`, box(X - 240, 200, EAVE_TOP, true).translate(0, s * (RUN - 100), EAVE_TOP / 2).color(wallRender));
}
const GABLE = [[-RUN, 0], [RUN, 0], [RUN, EAVE_TOP], [0, RIDGE_Z - DROP], [-RUN, EAVE_TOP]];
for (const sx of [-1, 1]) {
  add(`gable-wall-${sx < 0 ? 'west' : 'east'}`, alongX(GABLE, sx < 0 ? -X / 2 + 20 : X / 2 - 220, 200).color(wallRender));
}
for (const [side, place] of [['south', south], ['north', north]]) {
  for (let i = 0; i < 7; i += 1) {
    const x = -X / 2 + 100 + (i * (X - 200)) / 6;
    add(`rafter-${side}-${i}`, place(slab(0, RL, -200, -40, x - 22, 45)).color(timberTrim));
  }
  add(`fascia-${side}`, place(slab(RL - 30, RL, -230, -10)).color(timberTrim));
  add(`roof-deck-${side}`, place(slab(0, RL, -40, -18, -X / 2 - 60, X + 120)).color(timberTrim));
  for (const sx of [-1, 1]) {
    add(`barge-${side}-${sx < 0 ? 'west' : 'east'}`, place(slab(0, RL, -230, 0, sx < 0 ? -X / 2 - 90 : X / 2 + 60, 30)).color(timberTrim));
  }
  // Roof covering.
  if (roofing.value === 'standingSeam') {
    add(`metal-sheet-${side}`, place(slab(30, RL + 20, -18, -12, -X / 2 - 50, X + 100)).color(roofCover));
    for (let i = 0; i <= 8; i += 1) {
      add(`seam-${side}-${i}`, place(slab(30, RL + 20, -12, 25, -X / 2 - 40 + (i * (X + 70)) / 8, 10)).color(roofCover));
    }
  } else {
    const COURSE = 330;
    const n = Math.floor((RL - 30) / COURSE);
    for (let i = 0; i < n; i += 1) {
      const v0 = 40 + i * COURSE;
      // Each course overlaps the next: a wedge thick at the bottom edge.
      add(`tile-course-${side}-${i}`, place(alongX([[-v0 - COURSE - 20, -18], [-v0, -18], [-v0, 4], [-v0 - COURSE - 20, 40]], -X / 2 - 50, X + 100)).color(roofCover));
    }
  }
}
// Ridge cap: a shallow inverted V over the apex.
add('ridge-cap', alongX([[-160, -30], [-150, -40], [0, 40], [150, -40], [160, -30], [0, 60]], -X / 2 - 80, X + 160).translate(0, 0, RIDGE_Z).color(roofCover));

// PV install on the south slope: flashing L-feet, two rails, modules, clamps.
const MW = 1134;
const ML = Math.min(1722, RL - 420);
const N = 3;
const GAP = 20;
const W = N * MW + (N - 1) * GAP;
const V0 = (RL - ML) / 2 + 40;          // top edge of the module row down the slope
const RAILS = [V0 + ML * 0.2, V0 + ML * 0.8];
RAILS.forEach((v, r) => {
  for (let i = 0; i < 5; i += 1) {
    const x = -W / 2 + 160 + (i * (W - 320)) / 4;
    add(`flashing-${r}-${i}`, south(slab(v - 160, v + 120, 25, 31, x - 120, 240)).color(roofCover));
    add(`l-foot-${r}-${i}`, south(alongX([[-v - 20, 31], [-v + 20, 31], [-v + 20, 41], [-v - 10, 41], [-v - 10, 110], [-v - 20, 110]], x - 25, 50)).color(aluminum));
  }
  add(`rail-${r}`, south(alongX([[-v - 20, 110], [-v + 20, 110], [-v + 20, 150], [-v + 14, 150], [-v + 14, 144], [-v - 14, 144], [-v - 14, 150], [-v - 20, 150]], -W / 2 - 100, W + 200)).color(aluminum));
});
const ZM = 150;
for (let c = 0; c < N; c += 1) {
  const cx = -W / 2 + MW / 2 + c * (MW + GAP);
  const vc = V0 + ML / 2;
  for (const s of [-1, 1]) {
    add(`module-${c}-frame-side-${s < 0 ? 'w' : 'e'}`, south(box(32, ML, 35, true).translate(cx + s * (MW / 2 - 16), -vc, ZM + 17.5)).color(aluminum));
    add(`module-${c}-frame-end-${s < 0 ? 'top' : 'bot'}`, south(box(MW - 64, 32, 35, true).translate(cx, -vc + s * (ML / 2 - 16), ZM + 17.5)).color(aluminum));
  }
  add(`module-${c}-glass`, south(box(MW - 64, ML - 64, 6, true).translate(cx, -vc, ZM + 30)).color(solarGlass));
  for (let k = 1; k < 6; k += 1) {
    add(`module-${c}-cell-gap-${k}`, south(box(5, ML - 90, 1, true).translate(cx - (MW - 64) / 2 + (k * (MW - 64)) / 6, -vc, ZM + 33.5)).color(cellGap));
  }
  add(`module-${c}-split`, south(box(MW - 90, 8, 1, true).translate(cx, -vc, ZM + 33.5)).color(cellGap));
}
// End clamps at the array ends, mid clamps in the module gaps.
RAILS.forEach((v, r) => {
  for (let c = 0; c <= N; c += 1) {
    const x = -W / 2 + c * (MW + GAP) - GAP / 2;
    const kind = c === 0 || c === N ? 'end' : 'mid';
    const cx = c === 0 ? -W / 2 - 18 : c === N ? W / 2 + 18 : x;
    add(`${kind}-clamp-${r}-${c}`, south(box(kind === 'end' ? 30 : 46, 50, 44, true).translate(cx, -v, ZM + 22)).color(aluminum));
  }
});

return p.model();
