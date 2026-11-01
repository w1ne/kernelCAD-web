// Original kernelCAD low-poly wooden footbridge: plank deck on two stringer
// beams, carried by posts every 2 m that stand on the ground, with optional
// post-and-rail handrails. Spans along Y in whole 2 m tiles, so it crosses
// water or stream tiles on the 2 m grid.

meta({
  name: 'wooden-bridge',
  license: 'CC0-1.0',
  title: 'Wooden footbridge',
  description: 'Rustic plank footbridge on stringers and posts with optional handrails, spanning 2, 4 or 6 m along the 2 m grid. Knobs: length, deck height, handrails, plank, beam and rail colours.',
  tags: ['bridge', 'footbridge', 'boardwalk', 'pier', 'planks', 'wood', 'crossing', 'river', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'forest', 'meadow', 'beach'],
  triangleBudget: 1200,
});

const lengthM = param('lengthM', '4', { choices: ['2', '4', '6'], label: 'Length (m)' });
const deckM = param('deckM', '0.4', { choices: ['0.4', '0.8', '1.2'], label: 'Deck height (m)' });
const rails = param('rails', 'yes', { choices: ['yes', 'no'], label: 'Handrails' });
const plank = param('plank', '#a8763f', { label: 'Planks' });
const beam = param('beam', '#6e4a2a', { label: 'Beams and posts' });
const rail = param('rail', '#8a5f36', { label: 'Handrails' });

presets({
  weathered: { plank: '#a49a88', beam: '#6f665a', rail: '#8a8070' },
  painted: { plank: '#c0392b', beam: '#3b2a20', rail: '#efe8da' },
});

const L = Number(lengthM.value) * 1000;
const deckZ = Number(deckM.value) * 1000;
const W = 1400;
const pt = 50; // plank thickness
const sh = 160; // stringer height
const ps = 130; // post section
const hasRails = rails.value === 'yes';

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const br = assembly('wooden-bridge');
// Stringers just inside the posts.
for (const side of [-1, 1]) {
  const x = side * (W / 2 - 160);
  br.part(`stringer-${side < 0 ? 'left' : 'right'}`, blk(x - 60, -L / 2, deckZ - pt - sh, x + 60, L / 2, deckZ - pt + 2).color(beam));
}
// Planks: slightly uneven lengths and a little skew so the deck looks hand-laid.
const pw = 170;
const gap = 18;
const n = Math.floor((L - 60 + gap) / (pw + gap)); // skewed planks stay inside the span
const span = n * pw + (n - 1) * gap;
for (let i = 0; i < n; i++) {
  const y = -span / 2 + pw / 2 + i * (pw + gap);
  const extra = 40 * Math.sin(i * 2.3);
  const skew = 2.5 * Math.sin(i * 1.7);
  br.part(`plank-${i + 1}`, box(W - 40 + extra, pw, pt, true).rotateZ(skew).translate(18 * Math.sin(i * 3.1), y, deckZ - pt / 2).color(plank));
}
// Posts every 2 m, from the ground to the deck or up to handrail height.
const rows = Math.round(L / 2000) + 1;
const railTop = deckZ + 950;
for (let r = 0; r < rows; r++) {
  const y = -L / 2 + ps / 2 + ((L - ps) * r) / (rows - 1);
  for (const side of [-1, 1]) {
    const x = side * (W / 2 - ps / 2);
    const z1 = hasRails ? railTop : deckZ - pt;
    br.part(`post-${r + 1}-${side < 0 ? 'l' : 'r'}`, blk(x - ps / 2, y - ps / 2, 0, x + ps / 2, y + ps / 2, z1).color(beam));
  }
  // Cross beam tying each pair of posts under the stringers.
  br.part(`crossbeam-${r + 1}`, blk(-W / 2 + 10, y - 50, deckZ - pt - sh - 120, W / 2 - 10, y + 50, deckZ - pt - sh + 2).color(beam));
}
if (hasRails) {
  for (const side of [-1, 1]) {
    const x = side * (W / 2 - ps / 2);
    const s = side < 0 ? 'left' : 'right';
    br.part(`rail-top-${s}`, blk(x - 55, -L / 2, railTop - 70, x + 55, L / 2, railTop + 10).color(rail));
    br.part(`rail-mid-${s}`, blk(x - 30, -L / 2 + 5, deckZ + 380, x + 30, L / 2 - 5, deckZ + 450).color(rail));
  }
}

return br.model();
