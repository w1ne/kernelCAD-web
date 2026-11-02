// Original kernelCAD identification tag with an adjustable lanyard form.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'luggage-tag', license: 'CC0-1.0', title: 'Luggage tag',
  description: 'Small identification tag with a top strap and choice of address window or plain face. Knobs: tag size, face style and colors.',
  tags: ['luggage tag', 'bag tag', 'travel', 'identifier', 'luggage'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'airport', 'luggage'], triangleBudget: 260,
});

const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Tag size' });
const face = param('face', 'window', { choices: ['window', 'plain'], label: 'Tag face' });
const tag = param('tag', '#4b7784', { label: 'Tag' });
const strap = param('strap', '#302b29', { label: 'Attachment strap' });
const s = size.value === 'small' ? 0.78 : size.value === 'large' ? 1.22 : 1;
const card = assembly('luggage-tag');
card.part('tag-body', box(92 * s, 16 * s, 142 * s, true).translate(0, 0, 71 * s).color(tag));
card.part('top-tab', box(48 * s, 18 * s, 36 * s, true).translate(0, 0, 153 * s).color(tag));
card.part('strap-left', box(16 * s, 14 * s, 80 * s, true).translate(-24 * s, 0, 209 * s).color(strap));
card.part('strap-right', box(16 * s, 14 * s, 80 * s, true).translate(24 * s, 0, 209 * s).color(strap));
card.part('strap-bridge', box(64 * s, 14 * s, 16 * s, true).translate(0, 0, 247 * s).color(strap));

if (face.value === 'window') {
  card.part('address-window', box(62 * s, 8 * s, 82 * s, true).translate(0, -10 * s, 71 * s).color(strap));
  card.part('window-slot', box(42 * s, 6 * s, 36 * s, true).translate(0, -16 * s, 77 * s).color(tag));
} else {
  card.part('blank-label', box(64 * s, 8 * s, 44 * s, true).translate(0, -10 * s, 71 * s).color(strap));
}

return card.model();
