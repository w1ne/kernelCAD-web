// Original kernelCAD low-poly scaffolding: one 2.5 m bay of tube-and-board
// scaffold, one to three lifts high, with standards on base plates, ledgers,
// transoms, plank decks, toe boards, guard rails and a back brace per lift.
// Millimetres, Z up, working face toward -Y; bays tile along X.

meta({
  name: 'scaffolding-section',
  license: 'CC0-1.0',
  title: 'Scaffolding section',
  description: 'One bay of tube scaffolding with plank decks, toe boards, guard rails and bracing, one to three lifts high. Knobs: lifts, tube and board colours.',
  tags: ['scaffolding', 'scaffold', 'construction', 'building site', 'platform', 'tubes', 'planks', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'construction'],
  triangleBudget: 600,
});

const lifts = param('lifts', '2', { choices: ['1', '2', '3'], label: 'Lifts' });
const tube = param('tube', '#a9adb0', { label: 'Tubes' });
const boards = param('boards', '#c89a5a', { label: 'Boards' });

presets({
  painted: { tube: '#f2c418' },
  weathered: { boards: '#9a8a70' },
});

const n = Number(lifts.value);
const L = 2500;
const D = 1000;
const lh = 2000;
const t = 50;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Straight bar in the XZ plane at depth y, from (x0, z0) to (x1, z1), square section t.
const bar = (x0: number, z0: number, x1: number, z1: number, t: number, y = 0) => {
  const len = Math.hypot(x1 - x0, z1 - z0) + t;
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

const sc = assembly('scaffolding-section');
const xs = [-L / 2, L / 2];
const ys = [-D / 2, D / 2];
let k = 0;
for (const x of xs) {
  for (const y of ys) {
    k++;
    sc.part(`base-plate-${k}`, blk(x - 80, y - 80, 0, x + 80, y + 80, 10).color(tube));
    sc.part(`standard-${k}`, blk(x - t / 2, y - t / 2, 5, x + t / 2, y + t / 2, n * lh + 1050).color(tube));
  }
}
for (let i = 1; i <= n; i++) {
  const z = i * lh;
  for (const y of ys) {
    sc.part(`ledger-${i}-${y < 0 ? 'front' : 'back'}`, blk(-L / 2 - 60, y - t / 2 - t, z - t, L / 2 + 60, y - t / 2, z).color(tube));
  }
  for (const x of xs) {
    sc.part(`transom-${i}-${x < 0 ? 'l' : 'r'}`, blk(x + (x < 0 ? t / 2 : -t / 2 - t), -D / 2 - 120, z, x + (x < 0 ? t / 2 + t : -t / 2), D / 2 + 60, z + t).color(tube));
  }
  const pw = (D - 40) / 4;
  for (let p = 0; p < 4; p++) {
    const y0 = -D / 2 + 20 + p * pw;
    sc.part(`plank-${i}-${p + 1}`, blk(-L / 2 + t, y0 + 4, z + t, L / 2 - t, y0 + pw - 4, z + t + 40).color(boards));
  }
  sc.part(`toe-board-${i}`, blk(-L / 2 + t / 2, -D / 2 - t / 2 - 30, z + t, L / 2 - t / 2, -D / 2 - t / 2, z + t + 160).color(boards));
  sc.part(`guard-rail-${i}`, blk(-L / 2 - 60, -D / 2 - t / 2 - t, z + 950, L / 2 + 60, -D / 2 - t / 2, z + 1000).color(tube));
  sc.part(`mid-rail-${i}`, blk(-L / 2 - 60, -D / 2 - t / 2 - t, z + 500, L / 2 + 60, -D / 2 - t / 2, z + 550).color(tube));
  sc.part(`brace-${i}`, bar(-L / 2, z - lh + 100, L / 2, z - 60, 44, D / 2 + t).color(tube));
}

return sc.model();
