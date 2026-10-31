// Original kernelCAD low-poly sidewalk tile: a 4 m x 4 m raised pavement
// piece with a kerb along the road edge (-X) and a two-tone paving grid.
// Paving slabs are flush pieces, not decals. Millimetres, Z up, base on
// z = 0, top at 170 mm (150 mm kerb above a 20 mm road-tile).

meta({
  name: 'sidewalk-tile',
  license: 'CC0-1.0',
  title: 'Sidewalk tile',
  description: '4 m raised sidewalk tile with a kerb on the road side and a two-tone paving grid. Knobs: paving grid, kerb, paving and accent colours.',
  tags: ['sidewalk', 'pavement', 'kerb', 'curb', 'paving', 'tile', 'street'],
  kit: 'city-street',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'street', 'grid-4m'],
  triangleBudget: 400,
});

const grid = param('grid', '4', { choices: ['2', '3', '4', '5'], label: 'Paving grid' });
const kerb = param('kerb', '#8f8d88', { label: 'Kerb' });
const paving = param('paving', '#cfcac0', { label: 'Paving' });
const accent = param('accent', '#bdb7ab', { label: 'Accent paving' });

presets({
  brick: { paving: '#b0644a', accent: '#9a553e', kerb: '#a8a6a0' },
  dark: { paving: '#8d8f91', accent: '#7c7e80', kerb: '#c4c2bc' },
});

const S = 4000;
const H = 170;
const kw = 200; // kerb width
const n = Number(grid.value);
const sw = assembly('sidewalk-tile');
const h = S / 2;
// Kerb stones along the road edge, one per paving row.
for (let j = 0; j < n; j++) {
  sw.part(`kerb-${j + 1}`, box(kw, S / n, H, true).translate(-h + kw / 2, -h + (S / n) * (j + 0.5), H / 2).color(kerb));
}
// Checkerboard of paving slabs over the rest of the tile.
const px = (S - kw) / n;
const py = S / n;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const x = -h + kw + px * (i + 0.5);
    const y = -h + py * (j + 0.5);
    sw.part(`slab-${i + 1}-${j + 1}`, box(px, py, H, true).translate(x, y, H / 2).color((i + j) % 2 === 0 ? paving : accent));
  }
}

return sw.model();
