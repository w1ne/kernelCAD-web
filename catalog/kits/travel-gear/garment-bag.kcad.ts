// Original kernelCAD folded garment carrier with a zipper and hanger option.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'garment-bag', license: 'CC0-1.0', title: 'Garment bag',
  description: 'Folded garment carrier with a full-length closure, top grip and a choice of hanger hook or shoulder loop. Knobs: length, hanger and fabric colours.',
  tags: ['garment bag', 'suit carrier', 'travel', 'clothing', 'luggage'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'hotel', 'wardrobe'], triangleBudget: 420,
});

const length = param('length', 'long', { choices: ['short', 'long'], label: 'Garment length' });
const hanger = param('hanger', 'hook', { choices: ['hook', 'loop'], label: 'Top fitting' });
const cover = param('cover', '#424c57', { label: 'Cover fabric' });
const trim = param('trim', '#b17a49', { label: 'Trim' });
const H = length.value === 'short' ? 620 : 830;
const carrier = assembly('garment-bag');
carrier.part('folded-cover', box(590, 92, H, true).translate(0, 0, H / 2).color(cover));
carrier.part('zipper', box(16, 12, H * 0.86, true).translate(0, -51, H * 0.45).color(trim));
carrier.part('fold-band', box(610, 108, 30, true).translate(0, 0, H * 0.48).color(trim));
carrier.part('top-grip', box(150, 44, 28, true).translate(0, 0, H + 16).color(trim));

if (hanger.value === 'hook') {
  carrier.part('hanger-crossbar', box(210, 22, 24, true).translate(0, 0, H + 54).color(trim));
  carrier.part('hanger-arm-left', box(24, 22, 110, true).rotateY(-28).translate(-47, 0, H + 92).color(trim));
  carrier.part('hanger-arm-right', box(24, 22, 110, true).rotateY(28).translate(47, 0, H + 92).color(trim));
  carrier.part('hanger-hook', cylinder(80, 16, 8).translate(0, 0, H + 176).color(trim));
} else {
  carrier.part('shoulder-loop', box(34, 24, 150, true).translate(0, 0, H + 96).color(trim));
}

return carrier.model();
