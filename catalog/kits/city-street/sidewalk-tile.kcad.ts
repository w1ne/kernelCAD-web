// A modular 4 m x 4 m raised sidewalk with a continuous road-side kerb and a
// two-tone paving grid. The paving is built from flush rectilinear stone slabs,
// not decals. Millimetres, Z up, base on z = 0, top at 170 mm (150 mm above a
// matching 20 mm road tile).

meta({
  name: 'sidewalk-tile',
  license: 'CC0-1.0',
  title: 'Sidewalk tile',
  description: '4 m raised sidewalk tile with road-side concrete kerb stones and a two-tone paving-stone grid. Knobs: grid size, concrete, paving stone and accent-brick colours.',
  tags: ['sidewalk', 'pavement', 'kerb', 'curb', 'paving', 'tile', 'street'],
  kit: 'city-street',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'street', 'grid-4m'],
  triangleBudget: 400,
});

const grid = param('grid', '4', { choices: ['2', '3', '4', '5'], label: 'Paving grid' });
const kerbConcrete = param('kerbConcrete', '#8f8d88', { label: 'Kerb concrete' });
const pavingStone = param('pavingStone', '#cfcac0', { label: 'Paving stone' });
const accentBrick = param('accentBrick', '#bdb7ab', { label: 'Accent brick' });

presets({
  brick: { pavingStone: '#b0644a', accentBrick: '#9a553e', kerbConcrete: '#a8a6a0' },
  granite: { pavingStone: '#8d8f91', accentBrick: '#66686b', kerbConcrete: '#c4c2bc' },
});

const S = 4000;
const H = 170;
const kw = 200; // kerb width
const n = Number(grid.value);
const sw = assembly('sidewalk-tile');
const h = S / 2;
// Kerb stones along the road edge, one per paving row.
for (let j = 0; j < n; j++) {
  sw.part(`kerb-${j + 1}`, box(kw, S / n, H, true).translate(-h + kw / 2, -h + (S / n) * (j + 0.5), H / 2).color(kerbConcrete));
}
// Checkerboard of paving slabs over the rest of the tile.
const px = (S - kw) / n;
const py = S / n;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const x = -h + kw + px * (i + 0.5);
    const y = -h + py * (j + 0.5);
    const slab = box(px, py, H, true).translate(x, y, H / 2);
    if ((i + j) % 2 === 0) sw.part(`paving-${i + 1}-${j + 1}`, slab.color(pavingStone));
    else sw.part(`accent-${i + 1}-${j + 1}`, slab.color(accentBrick));
  }
}

return sw.model();
