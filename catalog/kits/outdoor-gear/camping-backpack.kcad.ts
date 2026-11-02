// Original low-poly trail pack with a selectable capacity and color zones.
// Millimetres, Z up, base at z = 0.

meta({
  name: 'camping-backpack',
  license: 'CC0-1.0',
  title: 'Camping backpack',
  description: 'Trail backpack with a top flap, front pocket, side bottle pockets and padded shoulder straps. Knobs: capacity, pack and trim colours.',
  tags: ['backpack', 'rucksack', 'camping', 'hiking', 'trail', 'gear'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 420,
});

const capacity = param('capacity', '40', { choices: ['30', '40', '60'], label: 'Capacity (L)' });
const pack = param('pack', '#52694d', { label: 'Pack fabric' });
const trim = param('trim', '#c4863a', { label: 'Trim and straps' });

presets({
  forest: { pack: '#52694d', trim: '#c4863a' },
  alpine: { pack: '#315b78', trim: '#d6d4c8' },
});

const liters = Number(capacity.value);
const height = 420 + (liters - 30) * 7;
const backpack = assembly('camping-backpack');

backpack.part('main-bag', box(300, 210, height, true).translate(0, 0, height / 2).color(pack));
backpack.part('front-pocket', box(240, 46, 170, true).translate(0, -116, 190).color(pack));
backpack.part('top-flap', box(320, 230, 42, true).translate(0, -4, height - 8).color(trim));
backpack.part('carry-handle', box(84, 32, 28, true).translate(0, 112, height + 22).color(trim));
backpack.part('left-side-pocket', box(54, 150, 180, true).translate(-174, -8, 130).color(trim));
backpack.part('right-side-pocket', box(54, 150, 180, true).translate(174, -8, 130).color(trim));
backpack.part('left-shoulder-strap', box(52, 34, height * 0.68, true).translate(-92, 118, height * 0.48).color(trim));
backpack.part('right-shoulder-strap', box(52, 34, height * 0.68, true).translate(92, 118, height * 0.48).color(trim));

return backpack.model();
