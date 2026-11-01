// Original kernelCAD low-poly coffee mug: a faceted hollow cup with a painted
// band and a C handle, empty or filled with black coffee or a frothy latte.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, handle toward +X.

meta({
  name: 'coffee-mug',
  license: 'CC0-1.0',
  title: 'Coffee mug',
  description: 'Ceramic coffee mug with a painted band and C handle, as an espresso cup, standard mug or tall mug, empty or filled with coffee or latte. Knobs: size, fill, mug, band, coffee and foam colours.',
  tags: ['mug', 'coffee mug', 'cup', 'coffee', 'tea', 'latte', 'espresso', 'kitchen', 'office'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'indoor', 'food', 'office', 'cafe', 'desk'],
  triangleBudget: 260,
});

const size = param('size', 'mug', { choices: ['espresso', 'mug', 'tall'], label: 'Size' });
const fill = param('fill', 'coffee', { choices: ['empty', 'coffee', 'latte'], label: 'Fill' });
const mug = param('mug', '#f0ece2', { label: 'Mug' });
const band = param('band', '#2f6fc0', { label: 'Band' });
const coffee = param('coffee', '#4a2c1a', { label: 'Coffee' });
const foam = param('foam', '#d8b88a', { label: 'Foam' });

presets({
  diner: { mug: '#f4f1e8', band: '#c8302a' },
  black: { mug: '#2a2a2c', band: '#e8c33a' },
  enamel: { mug: '#e8ece8', band: '#1f3a5a' },
});

const R = size.value === 'espresso' ? 30 : 42;
const H = size.value === 'espresso' ? 60 : size.value === 'tall' ? 125 : 95;
const n = 10;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const m = assembly('coffee-mug');
const wall = 5;
const base = 8;
m.part('mug', ngon(R * 0.9).loft(ngon(R), { spacing: base, ruled: true })
  .union(ngon(R).extrude(H - base).translate(0, 0, base))
  .subtract(ngon(R - wall).extrude(H).translate(0, 0, base)).color(mug));
m.part('band', ngon(R + 1).extrude(H * 0.14).translate(0, 0, H * 0.5).color(band));
// C handle, profile in (x, z), 12 mm thick; both ends sink into the wall.
const hp: [number, number][] = [
  [R - 4, H * 0.82], [R + H * 0.24, H * 0.78], [R + H * 0.3, H * 0.62], [R + H * 0.28, H * 0.34], [R + H * 0.14, H * 0.2], [R - 4, H * 0.22],
  [R - 4, H * 0.32], [R + H * 0.12, H * 0.33], [R + H * 0.17, H * 0.42], [R + H * 0.17, H * 0.6], [R + H * 0.13, H * 0.68], [R - 4, H * 0.7],
];
m.part('handle', extrudePolygon(hp, 12).rotateX(90).translate(0, 6, 0).color(mug));

if (fill.value !== 'empty') {
  const level = H - 12;
  m.part('coffee', ngon(R - wall).extrude(level - base - (fill.value === 'latte' ? 8 : 0)).translate(0, 0, base).color(coffee));
  if (fill.value === 'latte') m.part('foam', ngon(R - wall).extrude(8).translate(0, 0, level - 8).color(foam));
}

return m.model();
