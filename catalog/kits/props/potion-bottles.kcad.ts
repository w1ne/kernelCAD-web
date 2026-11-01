// Original kernelCAD low-poly potion bottles: a cluster of glass flasks of
// different shapes (round-bellied, tall square and conical) filled with
// coloured brews, with glass necks and cork stoppers. Millimetres, Z up,
// base on z = 0 centred on x = y = 0.

meta({
  name: 'potion-bottles',
  license: 'CC0-1.0',
  title: 'Potion bottles',
  description: 'Cluster of corked potion flasks in round, square and conical shapes with coloured brews, for alchemists, shops and loot. Knobs: count, three brew colours, glass and cork colours.',
  tags: ['potion', 'potions', 'bottles', 'flask', 'alchemy', 'elixir', 'magic', 'fantasy', 'loot', 'shop'],
  kit: 'props',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'fantasy', 'medieval', 'shop', 'dungeon', 'tavern'],
  triangleBudget: 480,
});

const count = param('count', '4', { choices: ['1', '3', '4', '5'], label: 'Bottles' });
const brewA = param('brewA', '#d8302a', { label: 'Brew A (health)' });
const brewB = param('brewB', '#2f6fd0', { label: 'Brew B (mana)' });
const brewC = param('brewC', '#5ad04a', { label: 'Brew C (poison)' });
const glass = param('glass', '#cfe4ea', { label: 'Glass necks' });
const cork = param('cork', '#a8743f', { label: 'Corks' });

presets({
  dark: { brewA: '#6a2a8a', brewB: '#2a2a2c', brewC: '#c8a43a' },
  pastel: { brewA: '#f08ab0', brewB: '#8ac8f0', brewC: '#c8f08a' },
});

const n = Number(count.value);
const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
  return p.close();
};
const stack = (rings: [number, number][], k0: number, x: number, y: number, rot = 0) =>
  ngon(rings[0][0], k0, rot).loft(rings.slice(1).map(([r]) => ngon(r, k0, rot)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });

const pb = assembly('potion-bottles');
// Each bottle: body (brew colour), neck (glass), cork. Body top = neck base.
type Kind = 'round' | 'square' | 'cone';
const add = (i: number, kind: Kind, x: number, y: number, s: number, brew: typeof brewA) => {
  let top: number;
  let neckR: number;
  if (kind === 'round') {
    pb.part(`bottle-${i}`, stack([[30 * s, 0], [55 * s, 25 * s], [55 * s, 70 * s], [22 * s, 105 * s]], 8, x, y).color(brew));
    top = 105 * s;
    neckR = 18 * s;
  } else if (kind === 'square') {
    pb.part(`bottle-${i}`, stack([[42 * s, 0], [42 * s, 130 * s], [20 * s, 155 * s]], 4, x, y, Math.PI / 4).color(brew));
    top = 155 * s;
    neckR = 16 * s;
  } else {
    pb.part(`bottle-${i}`, stack([[55 * s, 0], [52 * s, 15 * s], [18 * s, 115 * s]], 6, x, y).color(brew));
    top = 115 * s;
    neckR = 15 * s;
  }
  pb.part(`neck-${i}`, ngon(neckR, 6).extrude(55 * s).translate(x, y, top - 2).color(glass));
  pb.part(`cork-${i}`, ngon(neckR * 0.95, 6).loft(ngon(neckR * 1.2, 6), { spacing: 30 * s, ruled: true }).translate(x, y, top + 47 * s).color(cork));
};

const layout: [Kind, number, number, number, typeof brewA][] = [
  ['round', 0, 0, 1.2, brewA],
  ['square', 120, 60, 1, brewB],
  ['cone', -115, 50, 1, brewC],
  ['round', 60, -105, 0.8, brewB],
  ['square', -70, -95, 0.75, brewA],
];
for (let i = 0; i < n; i++) {
  const [k, x, y, s, b] = layout[i];
  add(i + 1, k, n === 1 ? 0 : x, n === 1 ? 0 : y, s, b);
}

return pb.model();
