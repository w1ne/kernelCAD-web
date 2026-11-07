// SPDX-License-Identifier: CC0-1.0
// Zippered packing cube. What makes it one rather than a box: soft
// ripstop sides with rounded corners that bulge slightly when full, a
// see-through mesh lid panel framed by binding tape, a two-way zip running
// round three sides of the lid with two pulls meeting at the front corner,
// and a webbing grab loop sewn into the end seam. Generic visualization
// geometry at real size (medium 330 x 250 x 100 mm), millimetres, Z up,
// base on z = 0, front facing -Y.
meta({
  name: 'packing-cube',
  license: 'CC0-1.0',
  title: 'Packing cube',
  description: 'Zippered travel packing cube: soft ripstop sides with rounded corners, see-through mesh lid framed by binding tape, two-way zip round three sides with two pulls, webbing grab loop and a woven label. Small, medium or large. Material controls: ripstop fabric, lid mesh, binding tape and loop, zip pulls; tealSet, charcoalSet and citrusSet presets.',
  tags: ['packing cube', 'packing organizer', 'luggage organizer', 'travel', 'zip', 'mesh', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'hotel', 'bedroom'],
  triangleBudget: 1400,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Cube size' });
const ripstop = param('ripstop', '#2f7f86', { label: 'Sides (ripstop nylon)' });
const mesh = param('mesh', '#1f3b40', { label: 'Lid panel (mesh)' });
const binding = param('binding', '#d9d4c7', { label: 'Binding tape and grab loop' });
const zipPull = param('zipPull', '#e0a43a', { label: 'Zip pulls (coated metal)' });
presets({
  tealSet: { ripstop: '#2f7f86', mesh: '#1f3b40', binding: '#d9d4c7', zipPull: '#e0a43a' },
  charcoalSet: { ripstop: '#3a3d42', mesh: '#1d1f22', binding: '#8b9096', zipPull: '#d24a3a' },
  citrusSet: { ripstop: '#e9a03b', mesh: '#5b4a2e', binding: '#f6efe0', zipPull: '#2f5d7a' },
});

const p = assembly('packing-cube');
const add = (name, shape) => p.part(name, shape);
const dims = { small: [250, 180, 90], medium: [330, 250, 100], large: [430, 320, 110] }[size.value];
const [W, D, H] = dims;
const R = 28;

// Soft body: rounded-corner block, slightly fuller at mid-height than at the seams.
add('body', extrudeRoundedRect(W, D, R, H - 14).translate(0, 0, 6).color(ripstop));
add('belly', extrudeRoundedRect(W + 8, D + 8, R + 4, H * 0.42).translate(0, 0, H * 0.24).color(ripstop));
add('base-seam', extrudeRoundedRect(W + 2, D + 2, R + 1, 8).color(binding));
// Lid: binding frame round a recessed mesh panel.
add('lid-binding', extrudeRoundedRect(W + 4, D + 4, R + 2, 10).translate(0, 0, H - 10)
  .subtract(extrudeRoundedRect(W - 50, D - 50, R - 10, 12).translate(0, 0, H - 11)).color(binding));
add('mesh-panel', extrudeRoundedRect(W - 48, D - 48, R - 10, 4).translate(0, 0, H - 6).color(mesh));
// Mesh weave: thin ribs across the panel so it reads as net, not plastic.
const ribsX = Math.floor((W - 60) / 22);
for (let i = 0; i <= ribsX; i += 1) {
  const x = -(W - 60) / 2 + (i * (W - 60)) / ribsX;
  add(`mesh-rib-x-${i}`, box(2.5, D - 56, 2, true).translate(x, 0, H - 1).color(ripstop));
}
const ribsY = Math.floor((D - 60) / 22);
for (let i = 0; i <= ribsY; i += 1) {
  const y = -(D - 60) / 2 + (i * (D - 60)) / ribsY;
  add(`mesh-rib-y-${i}`, box(W - 56, 2.5, 2, true).translate(0, y, H - 0.5).color(ripstop));
}

// Two-way zip round the lid seam (front and both ends), teeth just below the binding.
add('zip-front', box(W - 2 * R, 6, 8, true).translate(0, -D / 2 - 3, H - 16).color(mesh));
for (const sx of [-1, 1]) add(`zip-end-${sx}`, box(6, D - 2 * R, 8, true).translate(sx * (W / 2 + 3), 0, H - 16).color(mesh));
// Two pulls meeting near the front right corner.
for (const [i, x] of [W / 2 - R - 24, W / 2 - R - 4].entries()) {
  add(`zip-slider-${i}`, box(12, 8, 10, true).translate(x, -D / 2 - 6, H - 16).color(zipPull));
  add(`zip-pull-${i}`, extrudeRoundedRect(10, 34, 4, 3, { axis: 'y' }).translate(x, -D / 2 - 12, H - 33).color(zipPull));
}

// Webbing grab loop on the -X end seam and a woven label on the front.
add('grab-loop', torus(26, 5, 8).intersect(box(60, 60, 20).translate(-60, -30, -10)).translate(-W / 2 - 2, 0, H - 30).color(binding));
add('label', extrudeRoundedRect(60, 22, 3, 3, { axis: 'y' }).translate(-W / 2 + R + 50, -D / 2 - 5, H * 0.45).color(binding));

return p.model();
