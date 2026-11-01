// Original kernelCAD low-poly wooden dock: a plank jetty on log piles that
// stand on the ground or lake bed, with taller mooring posts at the corners,
// diagonal bracing, a boarding ladder at the far end and an optional bollard.
// Runs along -Y from the shore at y = +L/2, in whole 2 m tiles.

meta({
  name: 'wooden-dock',
  license: 'CC0-1.0',
  title: 'Wooden dock',
  description: 'Plank jetty on log piles with mooring posts, cross bracing and a boarding ladder, 2, 4 or 6 m long on the 2 m grid. Knobs: length, deck height, ladder, plank, pile and rope colours.',
  tags: ['dock', 'jetty', 'pier', 'wharf', 'boardwalk', 'planks', 'harbour', 'lake', 'fishing', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'beach', 'lake', 'harbour'],
  triangleBudget: 1100,
});

const lengthM = param('lengthM', '4', { choices: ['2', '4', '6'], label: 'Length (m)' });
const deckM = param('deckM', '0.5', { choices: ['0.5', '0.8', '1.2'], label: 'Deck height (m)' });
const ladder = param('ladder', 'yes', { choices: ['yes', 'no'], label: 'Ladder' });
const plank = param('plank', '#b08455', { label: 'Planks' });
const pile = param('pile', '#5e4430', { label: 'Piles and frame' });
const rope = param('rope', '#d8c79a', { label: 'Rope' });

presets({
  weathered: { plank: '#a39a8a', pile: '#5f5850', rope: '#c9c2b0' },
  dark: { plank: '#6e5038', pile: '#3a2a1e' },
});

const L = Number(lengthM.value) * 1000;
const deckZ = Number(deckM.value) * 1000;
const W = 1800;
const pt = 50;
const pr = 85; // pile radius

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / s), r * Math.sin(rot + (2 * Math.PI * k) / s));
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const dk = assembly('wooden-dock');
// Joists under the planks, along Y.
for (const x of [-W / 2 + 150, 0, W / 2 - 150]) {
  dk.part(`joist-${x}`, blk(x - 50, -L / 2, deckZ - pt - 140, x + 50, L / 2, deckZ - pt + 2).color(pile));
}
// Planks across X, uneven ends.
const pw = 190;
const gap = 16;
const n = Math.floor((L + gap) / (pw + gap));
const span = n * pw + (n - 1) * gap;
for (let i = 0; i < n; i++) {
  const y = -span / 2 + pw / 2 + i * (pw + gap);
  const ex = 50 * Math.sin(i * 2.7);
  dk.part(`plank-${i + 1}`, blk(-W / 2 + 20 + ex, y - pw / 2, deckZ - pt, W / 2 - 20 + ex * 0.6, y + pw / 2, deckZ - 5 * (0.5 + 0.5 * Math.sin(i * 4.1))).color(plank));
}
// Piles every 2 m; the seaward corner piles rise above the deck as mooring posts.
const rows = Math.round(L / 2000) + 1;
for (let r = 0; r < rows; r++) {
  const y = -L / 2 + pr + ((L - 2 * pr) * r) / (rows - 1);
  for (const side of [-1, 1]) {
    const x = side * (W / 2 - pr);
    const top = r === 0 ? deckZ + 450 : deckZ - pt;
    dk.part(`pile-${r + 1}-${side < 0 ? 'l' : 'r'}`, ngon(pr, 6).extrude(top).translate(x, y, 0).color(pile));
    if (r === 0) dk.part(`rope-${side < 0 ? 'l' : 'r'}`, ngon(pr + 18, 6, 0.5).extrude(90).translate(x, y, deckZ + 200).color(rope));
  }
  dk.part(`cap-beam-${r + 1}`, blk(-W / 2, y - 60, deckZ - pt - 140 - 120, W / 2, y + 60, deckZ - pt - 138).color(pile));
  // Diagonal brace between each pair of piles.
  const braceLen = Math.hypot(W - 2 * pr, deckZ * 0.6);
  const ang = (Math.atan2(deckZ * 0.6, W - 2 * pr) * 180) / Math.PI;
  dk.part(`brace-${r + 1}`, box(braceLen, 50, 90, true).rotateY(-ang).translate(0, y + (r === 0 ? 70 : -70), deckZ * 0.42).color(pile));
}
if (ladder.value === 'yes') {
  // Boarding ladder hanging off the seaward end into the water.
  const y = -L / 2 - 40;
  for (const sx of [-220, 220]) dk.part(`ladder-rail-${sx < 0 ? 'l' : 'r'}`, blk(sx - 25, y - 40, 0, sx + 25, y + 40, deckZ + 250).color(pile));
  const rungs = Math.max(2, Math.round(deckZ / 280));
  for (let i = 0; i < rungs; i++) {
    const z = deckZ * 0.2 + ((deckZ - pt - deckZ * 0.2) * i) / Math.max(1, rungs - 1);
    dk.part(`rung-${i + 1}`, blk(-196, y - 30, z - 25, 196, y + 30, z + 25).color(plank));
  }
}

return dk.model();
