// Original kernelCAD passport sleeve with a closed cover or open folio layout.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'passport-wallet', license: 'CC0-1.0', title: 'Passport wallet',
  description: 'Compact travel folio with card slots and a passport sleeve, shown closed or open. Knobs: size, layout, cover and lining colours.',
  tags: ['passport wallet', 'passport cover', 'travel folio', 'travel', 'document holder'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'airport', 'documents'], triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard'], label: 'Folio size' });
const layout = param('layout', 'closed', { choices: ['closed', 'open'], label: 'Folio layout' });
const cover = param('cover', '#6c4335', { label: 'Cover' });
const lining = param('lining', '#bd9c71', { label: 'Lining and pockets' });
const s = size.value === 'compact' ? 0.78 : 1;
const folio = assembly('passport-wallet');

if (layout.value === 'closed') {
  folio.part('outer-cover', box(210 * s, 22 * s, 270 * s, true).translate(0, 0, 135 * s).color(cover));
  folio.part('spine-band', box(18 * s, 25 * s, 270 * s, true).translate(0, 0, 135 * s).color(lining));
  folio.part('closure-tab', box(72 * s, 18 * s, 44 * s, true).translate(62 * s, 0, 135 * s).color(lining));
} else {
  folio.part('left-cover', box(100 * s, 14 * s, 270 * s, true).translate(-52 * s, 0, 135 * s).color(cover));
  folio.part('right-cover', box(100 * s, 14 * s, 270 * s, true).translate(52 * s, 0, 135 * s).color(cover));
  folio.part('passport-sleeve', box(82 * s, 9 * s, 204 * s, true).translate(-52 * s, -12 * s, 135 * s).color(lining));
  folio.part('card-slot-one', box(70 * s, 8 * s, 35 * s, true).translate(52 * s, -11 * s, 190 * s).color(lining));
  folio.part('card-slot-two', box(70 * s, 8 * s, 35 * s, true).translate(52 * s, -11 * s, 135 * s).color(lining));
}

return folio.model();
