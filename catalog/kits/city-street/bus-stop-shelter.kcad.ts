// Original kernelCAD low-poly bus stop shelter: four posts, a sloped roof
// slab, a glazed back wall, optional glazed side screens and a perch bench.
// Millimetres, Z up, base on z = 0, open side facing -Y.

meta({
  name: 'bus-stop-shelter',
  license: 'CC0-1.0',
  title: 'Bus stop shelter',
  description: 'Glazed bus stop shelter with a sloped roof, back wall, optional side screens and a bench. Knobs: length, side screens, frame, glass and roof colours.',
  tags: ['bus stop', 'shelter', 'transit', 'bus', 'waiting', 'canopy', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 400,
});

const lengthMm = param('lengthMm', '3600', { choices: ['2400', '3600', '4800'], label: 'Length (mm)' });
const sides = param('sides', 'both', { choices: ['none', 'one', 'both'], label: 'Side screens' });
const frame = param('frame', '#3a3f45', { label: 'Frame' });
const glass = param('glass', '#a9cfe0', { label: 'Glass' });
const roof = param('roof', '#5d646b', { label: 'Roof' });
const seat = param('seat', '#b37a45', { label: 'Bench' });

presets({
  red: { frame: '#a8262b', roof: '#a8262b' },
  green: { frame: '#1f4a30', roof: '#1f4a30', glass: '#bfe0d0' },
});

const L = Number(lengthMm.value);
const D = 1500;
const H = 2400;
const p = 80; // post size
const nSides = sides.value === 'both' ? 2 : sides.value === 'one' ? 1 : 0;

const bs = assembly('bus-stop-shelter');
const xs = [-L / 2 + p / 2, L / 2 - p / 2];
const ys = [-D / 2 + p / 2, D / 2 - p / 2];
let pi = 0;
for (const x of xs) {
  for (const y of ys) {
    pi += 1;
    bs.part(`post-${pi}`, box(p, p, H, true).translate(x, y, H / 2).color(frame));
  }
}
// Roof: a slab that slopes down toward the back, with a little overhang.
const roofPts: [number, number][] = [[-D / 2 - 200, 0], [D / 2 + 100, -80], [D / 2 + 100, 40], [-D / 2 - 200, 140]];
bs.part('roof', extrudePolygon(roofPts, L + 300).rotateX(90).rotateZ(90).translate(-L / 2 - 150, 0, H).color(roof));
// Back wall: glass pane between the rear posts, with a kick rail below.
const paneZ0 = 300;
const paneZ1 = H - 150;
bs.part('back-rail', box(L - 2 * p, 40, paneZ0, true).translate(0, ys[1]!, paneZ0 / 2).color(frame));
bs.part('back-glass', box(L - 2 * p, 20, paneZ1 - paneZ0, true).translate(0, ys[1]!, (paneZ0 + paneZ1) / 2).color(glass));
bs.part('back-head', box(L - 2 * p, 40, H - paneZ1, true).translate(0, ys[1]!, (paneZ1 + H) / 2).color(frame));
// Side screens between the front and rear posts.
for (let i = 0; i < nSides; i++) {
  const x = i === 0 ? xs[1]! : xs[0]!;
  bs.part(`side-glass-${i + 1}`, box(20, D - 2 * p, paneZ1 - paneZ0, true).translate(x, 0, (paneZ0 + paneZ1) / 2).color(glass));
  bs.part(`side-head-${i + 1}`, box(40, D - 2 * p, H - paneZ1, true).translate(x, 0, (paneZ1 + H) / 2).color(frame));
}
// Bench along the back wall on two brackets.
const benchL = Math.min(L - 600, 2400);
bs.part('bench', box(benchL, 380, 50, true).translate(0, ys[1]! - 230, 475).color(seat));
for (const [i, x] of [[1, -benchL / 2 + 150], [2, benchL / 2 - 150]] as [number, number][]) {
  bs.part(`bench-leg-${i}`, box(50, 50, 450, true).translate(x, ys[1]! - 230, 225).color(frame));
}

return bs.model();
