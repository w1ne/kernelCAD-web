// SPDX-License-Identifier: CC0-1.0
// Toiletry bag (dopp kit). What makes it one rather than a box: a soft
// canvas body that is wider at the base than at the top so it stands
// open-mouthed, a curved zip running along the ridge with leather pull tabs,
// leather end gussets, a leather carry loop stitched into one end, and a
// waterproof base panel. The hanging version adds a folding brass hook on
// one end. Generic visualization geometry at real size
// (standard 260 x 140 x 150 mm), millimetres, Z up, base on z = 0, long
// axis X, front facing -Y.
meta({
  name: 'toiletry-bag',
  license: 'CC0-1.0',
  title: 'Toiletry bag',
  description: 'Canvas dopp kit: soft trapezoid body wider at the base, ridge zip with leather pull tabs, leather end gussets and carry loop, waterproof base panel. Case or hanging layout with folding hook. Compact or standard. Material controls: canvas body, leather trim, zip and hardware metal, base lining; waxedGreen, charcoalLeather and sandCanvas presets.',
  tags: ['toiletry bag', 'dopp kit', 'wash bag', 'travel', 'bathroom', 'canvas', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'hotel', 'bathroom'],
  triangleBudget: 1300,
});

const layout = param('layout', 'case', { choices: ['case', 'hanging'], label: 'Organizer layout' });
const size = param('size', 'standard', { choices: ['compact', 'standard'], label: 'Bag size' });
const canvas = param('canvas', '#5d6e55', { label: 'Body (waxed canvas)' });
const leather = param('leather', '#8b5a32', { label: 'Gussets, tabs and loop (leather)' });
const hardware = param('hardware', '#c09a4c', { label: 'Zip and hook (brass)' });
const baseLining = param('baseLining', '#2c2a27', { label: 'Base panel (coated)' });
presets({
  waxedGreen: { canvas: '#4f5f46', leather: '#7a4a28', hardware: '#b8913e', baseLining: '#24221f' },
  charcoalLeather: { canvas: '#36393d', leather: '#1e1c1b', hardware: '#a9b0b5', baseLining: '#1a1a1a' },
  sandCanvas: { canvas: '#c9b38c', leather: '#5c3a22', hardware: '#c09a4c', baseLining: '#4a3d2e' },
});

const p = assembly('toiletry-bag');
const k = size.value === 'compact' ? 0.82 : 1;
const add = (name, shape) => p.part(name, shape.scale(k));
const L = 260;   // length (X)
const DB = 140;  // depth at the base (Y)
const DT = 70;   // depth at the ridge
const H = 150;   // height

// Trapezoid cross-section (y, z), rounded, extruded along X.
const section = (inset) => filletPolygon([
  [-DB / 2 + inset, inset], [DB / 2 - inset, inset], [DT / 2 - inset * 0.6, H - inset], [-DT / 2 + inset * 0.6, H - inset],
], 22 - inset * 0.5);
const alongX = (pts, len, x0) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);

add('body', alongX(section(0), L - 30, -L / 2 + 15).color(canvas));
for (const sx of [-1, 1]) add(`end-gusset-${sx}`, alongX(section(3), 15, sx < 0 ? -L / 2 : L / 2 - 15).color(leather));
add('base-panel', extrudeRoundedRect(L - 6, DB - 6, 16, 6).color(baseLining));

// Ridge zip with brass teeth and two leather pull tabs.
add('zip-tape', box(L - 24, 16, 4, true).translate(0, 0, H + 1).color(baseLining));
add('zip-teeth', box(L - 34, 5, 5, true).translate(0, 0, H + 2).color(hardware));
for (const [i, x] of [-L / 2 + 40, -L / 2 + 58].entries()) {
  add(`zip-slider-${i}`, box(10, 10, 7, true).translate(x, 0, H + 4).color(hardware));
  add(`pull-tab-${i}`, extrudeRoundedRect(10, 30, 4, 3, { axis: 'y' }).rotateX(-25).translate(x, -6, H - 22).color(leather));
}

// Leather carry loop on the +X end.
const loop = torus(32, 7, 10).scale([0.5, 1, 1]).intersect(box(40, 80, 30).translate(0, -40, -15)).rotateX(90);
add('carry-loop', loop.translate(L / 2 - 4, 0, H * 0.58).color(leather));
add('loop-rivets', box(6, 20, 64, true).translate(L / 2 + 0.5, 0, H * 0.58).color(hardware));

// Front leather badge.
add('badge', extrudeRoundedRect(46, 26, 6, 3, { axis: 'y' }).rotateX(-12).translate(0, -DB / 2 + 18, H * 0.4).color(leather));

if (layout.value === 'hanging') {
  // Folding brass hook on the -X end, rising above the ridge.
  add('hook-post', cylinder(70, 3, 8).translate(-L / 2 - 4, 0, H * 0.6).color(hardware));
  add('hook-curl', torus(18, 3, 8).intersect(box(40, 40, 10).translate(-20, 0, -5)).rotateX(90).translate(-L / 2 - 22, 0, H * 0.6 + 70).color(hardware));
  add('hook-base', box(10, 24, 24, true).translate(-L / 2 - 3, 0, H * 0.6).color(leather));
}

return p.model();
