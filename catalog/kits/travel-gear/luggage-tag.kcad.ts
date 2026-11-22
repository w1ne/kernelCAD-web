// SPDX-License-Identifier: CC0-1.0
// Leather luggage tag. What makes it one rather than a plate: a stitched
// leather body with rounded corners and a tapered neck at the top, a clear
// vinyl window over a paper address card (or a privacy flap closed over it),
// a punched slot reinforced with a metal eyelet, and a leather strap threaded
// through it and fastened with a roller buckle. Generic visualization geometry
// at real size (standard tag 70 x 110 mm), millimetres, Z up, lying flat on
// z = 0 with the strap laid out towards +Y.
meta({
  name: 'luggage-tag',
  license: 'CC0-1.0',
  title: 'Luggage tag',
  description: 'Leather luggage tag lying flat: stitched body with rounded corners and tapered neck, clear address window over a paper card or a closed privacy flap, metal eyelet slot, leather strap with roller buckle. Small, standard or large. Material controls: tag leather, stitching thread, address card paper, buckle metal; saddleTan, navyCrossgrain and redTravel presets.',
  tags: ['luggage tag', 'bag tag', 'address tag', 'travel', 'leather', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'airport', 'luggage'],
  triangleBudget: 1700,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Tag size' });
const face = param('face', 'window', { choices: ['window', 'privacy flap'], label: 'Tag face' });
const leather = param('leather', '#9a5a2e', { label: 'Tag and strap (leather)' });
const thread = param('thread', '#efe2c4', { label: 'Stitching (waxed thread)' });
const card = param('card', '#f4f1e8', { label: 'Address card (paper)' });
const buckle = param('buckle', '#c6a253', { label: 'Eyelet and buckle (brass)' });
presets({
  saddleTan: { leather: '#a8683a', thread: '#f1e4c6', card: '#f4f1e8', buckle: '#c6a253' },
  navyCrossgrain: { leather: '#1f2d48', thread: '#c9cfd8', card: '#eef1f4', buckle: '#b9c0c6' },
  redTravel: { leather: '#b8322c', thread: '#f6efe2', card: '#fff8e8', buckle: '#d8d8d8' },
});

const p = assembly('luggage-tag');
const k = { small: 0.8, standard: 1, large: 1.25 }[size.value];
const add = (name, shape) => p.part(name, shape.scale(k));
const W = 70;
const L = 110;
const T = 4;

// Tag outline (x, y): rounded rectangle with a tapered neck at +Y.
const outline = (inset) => filletPolygon([
  [-W / 2 + inset, -L / 2 + inset], [W / 2 - inset, -L / 2 + inset], [W / 2 - inset, L / 2 - 22],
  [16 - inset * 0.5, L / 2 - inset], [-16 + inset * 0.5, L / 2 - inset], [-W / 2 + inset, L / 2 - 22],
], 9 - inset * 0.4);

// Two leather plies stitched together, the slot punched near the neck.
const slot = extrudeRoundedRect(20, 6, 3, 20).translate(0, L / 2 - 11, -5);
add('back-ply', extrudePolygon(outline(0), T / 2).subtract(slot).color(leather));
add('front-ply', extrudePolygon(outline(0.8), T / 2).translate(0, 0, T / 2).subtract(slot).color(leather));
add('eyelet', extrudeRoundedRect(26, 12, 6, 1.2).subtract(extrudeRoundedRect(20, 6, 3, 3).translate(0, 0, -1))
  .translate(0, L / 2 - 11, T).color(buckle));
// Stitch line: short dashes running just inside the edge.
const stitch = outline(4);
for (let i = 0; i < stitch.length; i += 2) {
  const [x0, y0] = stitch[i];
  const [x1, y1] = stitch[(i + 1) % stitch.length];
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) continue;
  const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  add(`stitch-${i}`, box(Math.min(len, 9), 1.2, 0.6, true).rotateZ(ang).translate((x0 + x1) / 2, (y0 + y1) / 2, T + 0.3).color(thread));
}

// Address window over the card, or a privacy flap snapped over it.
if (face.value === 'window') {
  add('address-card', extrudeRoundedRect(52, 66, 3, 0.6).translate(0, -8, T).color(card));
  for (let i = 0; i < 4; i += 1) add(`address-line-${i}`, box(i === 0 ? 30 : 40, 2, 0.4, true).translate(i === 0 ? -6 : 0, 12 - i * 10, T + 0.8).color(leather));
  add('window-frame', extrudeRoundedRect(58, 72, 5, 1).subtract(extrudeRoundedRect(50, 64, 3, 3).translate(0, 0, -1)).translate(0, -8, T).color(leather));
} else {
  add('privacy-flap', extrudeRoundedRect(58, 72, 6, 1.5).translate(0, -8, T).color(leather));
  add('flap-snap', cylinder(1.5, 5, 12).translate(0, -40, T + 1.5).color(buckle));
}

// Strap threaded through the slot, laid out flat to +Y, with a roller buckle.
const SY = L / 2 - 11;
add('strap-under', box(16, 150, 2, true).translate(0, SY + 70, 1).color(leather));
add('strap-over', box(16, 30, 2, true).translate(0, SY + 6, T + 1.5).color(leather));
add('strap-tip', extrudeRoundedRect(16, 20, 7.5, 2).translate(0, SY + 150, 0).color(leather));
for (let i = 0; i < 4; i += 1) add(`strap-hole-${i}`, cylinder(0.5, 1.8, 8).translate(0, SY + 100 + i * 12, 2).color('#2a1a10'));
add('buckle-frame', extrudeRoundedRect(22, 14, 3, 2.5).subtract(box(16, 6, 6, true).translate(0, -1, 0)).translate(0, SY + 34, 2).color(buckle));
add('buckle-roller', cylinder(20, 1.6, 8).rotateY(90).translate(-10, SY + 40, 3.6).color(buckle));
add('buckle-keeper', box(20, 5, 3, true).translate(0, SY + 48, 3).color(leather));

return p.model();
