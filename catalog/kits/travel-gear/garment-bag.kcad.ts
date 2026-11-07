// SPDX-License-Identifier: CC0-1.0
// Hanging suit carrier. What makes it a garment bag rather than a flat panel:
// a tall soft bag cut with sloping shoulders like the suit inside, a chrome
// hanger hook rising through a reinforced collar at the top, a full-length
// zip down the front, a clear ID window, piped edges, and a pair of webbing
// carry handles stitched across the middle so the bag can be folded and
// carried. Generic visualization geometry at real size (600 x 110 mm, 1000 or
// 1350 mm long), millimetres, Z up, hanging with its hem resting on z = 0,
// front facing -Y.
meta({
  name: 'garment-bag',
  license: 'CC0-1.0',
  title: 'Garment bag',
  description: 'Hanging suit carrier: tall soft bag with sloping shoulders, chrome hanger hook through a reinforced collar, full-length front zip with pull, clear ID window, piped edges and webbing carry handles. Suit or dress length. Material controls: bag fabric, piping and handle trim, hanger chrome, ID window; charcoalSuit, weddingIvory and travelNavy presets.',
  tags: ['garment bag', 'suit carrier', 'suit bag', 'luggage', 'travel', 'wardrobe', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'hotel', 'wardrobe'],
  triangleBudget: 2400,
});

const length = param('length', 'suit', { choices: ['suit', 'dress'], label: 'Bag length' });
const fabric = param('fabric', '#33383f', { label: 'Bag (nylon fabric)' });
const trim = param('trim', '#8a6a44', { label: 'Piping and handles (trim)' });
const chrome = param('chrome', '#c9ced2', { label: 'Hanger hook and zip pull (chrome)' });
const window = param('window', '#d7e4ea', { label: 'ID window (clear vinyl)' });
presets({
  charcoalSuit: { fabric: '#2b2e33', trim: '#1b1d20', chrome: '#c9ced2', window: '#cfdbe0' },
  weddingIvory: { fabric: '#ece6da', trim: '#c2a874', chrome: '#e0d3b0', window: '#f3f1ea' },
  travelNavy: { fabric: '#1f3150', trim: '#9b4a2b', chrome: '#b9c0c6', window: '#d7e4ea' },
});

const p = assembly('garment-bag');
const add = (name, shape) => p.part(name, shape);
const W = 600;
const T = 110;                                 // bag thickness (Y)
const H = length.value === 'dress' ? 1350 : 1000;
const SH = 140;                                // shoulder drop

// Front outline (x, z): straight sides, rounded hem, shoulders sloping up to a narrow collar.
const outline = (inset) => filletPolygon([
  [-W / 2 + inset, inset], [W / 2 - inset, inset], [W / 2 - inset, H - SH], [70 - inset * 0.3, H - inset],
  [-70 + inset * 0.3, H - inset], [-W / 2 + inset, H - SH],
], 60 - inset * 0.5);
// Extrude an (x, z) outline through Y, front face at y0, depth t towards +Y.
const slab = (pts, t, y0) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);

add('bag-body', slab(outline(0), T - 30, -T / 2 + 15).color(fabric));
// Soft front and back panels a little smaller, bulging out beyond the piping.
add('front-panel', slab(outline(14), 16, -T / 2).color(fabric));
add('back-panel', slab(outline(14), 16, T / 2 - 16).color(fabric));
// Piping round both seams.
for (const [i, y] of [-T / 2 + 12, T / 2 - 18].entries()) {
  const ring = slab(outline(-3), 6, y).subtract(slab(outline(6), 8, y - 1));
  add(`piping-${i}`, ring.intersect(box(W + 20, T, H + 20).translate(-W / 2 - 10, -T / 2, 0)).color(trim));
}

// Full-length zip down the front with a chrome pull near the top.
add('zip-tape', box(26, 4, H - SH - 80, true).translate(0, -T / 2 - 1, (H - SH) / 2 + 30).color(trim));
add('zip-teeth', box(8, 6, H - SH - 90, true).translate(0, -T / 2 - 2, (H - SH) / 2 + 30).color(chrome));
add('zip-pull', box(14, 6, 46, true).translate(0, -T / 2 - 6, H - SH - 40).color(chrome));

// Clear ID window with a card behind it, upper left of the front.
add('id-frame', extrudeRoundedRect(150, 100, 10, 4, { axis: 'y' }).translate(-W * 0.26, -T / 2 - 3, H * 0.62).color(trim));
add('id-window', extrudeRoundedRect(130, 80, 6, 4, { axis: 'y' }).translate(-W * 0.26, -T / 2 - 5, H * 0.62).color(window));

// Webbing carry handles across the middle, stitched at both ends.
for (const sx of [-1, 1]) {
  add(`handle-patch-${sx}`, box(70, 6, 40, true).translate(sx * 95, -T / 2 - 3, H * 0.44).color(trim));
}
const handle = torus(95, 8, 16).intersect(box(300, 200, 40).translate(-150, -200, -20)).scale([1, 0.5, 1]).rotateX(90);
add('carry-handle', handle.translate(0, -T / 2 - 4, H * 0.44).color(trim));

// Reinforced collar and the chrome hanger hook coming out through it.
add('collar', extrudeRoundedRect(110, 70, 20, 40).translate(0, 0, H - 30).color(trim));
add('hook-stem', cylinder(80, 5, 10).translate(0, 0, H + 10).color(chrome));
const hook = torus(32, 5, 10).intersect(box(80, 80, 20).translate(-40, 0, -10)).rotateX(90);
add('hook-curl', hook.translate(-32, 0, H + 90).color(chrome));

return p.model();
