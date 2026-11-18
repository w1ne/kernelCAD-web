// Original kernelCAD low-poly IBC tote: a 1000-litre plastic tank in a
// tubular steel cage on a pallet, with a filler cap on top and a drain valve
// at the front; the tank shows its fill level as a darker liquid band.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, valve faces -Y.

meta({
  name: 'ibc-tote',
  license: 'CC0-1.0',
  title: 'IBC tote',
  description: 'Intermediate bulk container: 1000-litre plastic tank in a steel grid cage on a pallet, with filler cap and drain valve, empty to full. Knobs: fill level, cage grid, pallet type, tank, liquid, cage, pallet and valve colours.',
  tags: ['ibc', 'ibc tote', 'tote tank', 'bulk container', 'water tank', 'chemical', 'industrial', 'warehouse', 'farm'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['warehouse', 'industrial', 'farm', 'outdoor', 'factory', 'dock'],
  triangleBudget: 620,
});

const level = param('fill', '60', { choices: ['0', '30', '60', '100'], label: 'Fill level (%)' });
const grid = param('grid', '4', { choices: ['3', '4'], label: 'Cage bars per side' });
const pallet = param('pallet', 'steel', { choices: ['steel', 'wood'], label: 'Pallet' });
const tank = param('tank', '#e8eae2', { label: 'Tank' });
const liquid = param('liquid', '#5a8ab0', { label: 'Liquid' });
const cage = param('cage', '#9aa2a8', { label: 'Cage' });
const base = param('base', '#5a6066', { label: 'Pallet' });
const valve = param('valve', '#2a2a2c', { label: 'Valve and cap' });

presets({
  diesel: { liquid: '#c8a03a', base: '#3a3d40' },
  rainwater: { liquid: '#3a6a5a', tank: '#2a2a2c', base: '#8a5a33', pallet: 'wood' },
  rusty: { cage: '#8a6a52', base: '#5a3d2c' },
});

const L = 1200;
const W = 1000;
const P = 150; // pallet height
const T = 1000; // tank height
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const t = assembly('ibc-tote');
// Pallet: a deck plate on three runners (steel) or a slatted deck on blocks (wood).
if (pallet.value === 'steel') {
  t.part('pallet', blk(-L / 2, -W / 2, P - 30, L / 2, W / 2, P)
    .union(blk(-L / 2, -W / 2, 0, -L / 2 + 120, W / 2, P - 29))
    .union(blk(-60, -W / 2, 0, 60, W / 2, P - 29))
    .union(blk(L / 2 - 120, -W / 2, 0, L / 2, W / 2, P - 29)).color(base));
} else {
  t.part('pallet', blk(-L / 2, -W / 2, P - 25, L / 2, W / 2, P).color(base));
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
    t.part(`block-${x + 2}${y + 2}`, blk(x * 480 - 60, y * 400 - 60, 0, x * 480 + 60, y * 400 + 60, P - 24).color(base));
  }
}

// Tank: a rounded-corner block; the lower part is tinted by the liquid inside.
const inset = 40;
const tL = L - 2 * inset;
const tW = W - 2 * inset;
const c = 60;
const tankPts: [number, number][] = [
  [-tL / 2 + c, -tW / 2], [tL / 2 - c, -tW / 2], [tL / 2, -tW / 2 + c], [tL / 2, tW / 2 - c],
  [tL / 2 - c, tW / 2], [-tL / 2 + c, tW / 2], [-tL / 2, tW / 2 - c], [-tL / 2, -tW / 2 + c],
];
const fillH = (T - 20) * (Number(level.value) / 100);
if (fillH > 0) t.part('liquid', extrudePolygon(tankPts, fillH).translate(0, 0, P).color(liquid));
if (fillH < T - 20) t.part('tank', extrudePolygon(tankPts, T - 20 - fillH).translate(0, 0, P + fillH).color(tank));
t.part('cap', blk(-90, -90, P + T - 21, 90, 90, P + T + 30).color(valve));
t.part('valve', blk(-50, -W / 2 - 70, P + 10, 50, -tW / 2 + 1, P + 90)
  .union(blk(-25, -W / 2 - 120, P + 30, 25, -W / 2 - 69, P + 70)).color(valve));

// Cage: corner posts, three horizontal rings and n vertical bars per face,
// each bar its own box so crossings do not split faces.
const b = 30;
const top = P + T + 10;
let bars = 0;
const bar = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
  bars += 1;
  t.part(`cage-${bars}`, blk(x0, y0, z0, x1, y1, z1).color(cage));
};
for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
  const x0 = x > 0 ? L / 2 - b : -L / 2;
  const y0 = y > 0 ? W / 2 - b : -W / 2;
  bar(x0, y0, P - 1, x0 + b, y0 + b, top);
}
for (const z of [P + 300, P + 650, top - b]) {
  bar(-L / 2 + b, -W / 2, z, L / 2 - b, -W / 2 + b, z + b);
  bar(-L / 2 + b, W / 2 - b, z, L / 2 - b, W / 2, z + b);
  bar(-L / 2, -W / 2 + b, z, -L / 2 + b, W / 2 - b, z + b);
  bar(L / 2 - b, -W / 2 + b, z, L / 2, W / 2 - b, z + b);
}
const n = Number(grid.value);
for (let i = 1; i <= n; i++) {
  const x = -L / 2 + (L * i) / (n + 1);
  const y = -W / 2 + (W * i) / (n + 1);
  // Vertical bars sit just outside the rings so they read as a woven grid.
  for (const sy of [-1, 1]) bar(x - 12, sy > 0 ? W / 2 - 6 : -W / 2 - 18, P - 1, x + 12, sy > 0 ? W / 2 + 18 : -W / 2 + 6, top + b);
  for (const sx of [-1, 1]) bar(sx > 0 ? L / 2 - 6 : -L / 2 - 18, y - 12, P - 1, sx > 0 ? L / 2 + 18 : -L / 2 + 6, y + 12, top + b);
}

return t.model();
