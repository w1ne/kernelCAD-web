// Original kernelCAD low-poly stair tile: a 2 m x 2 m flight of stone steps
// climbing from the 0.2 m tile height at the front (-Y) to a raised landing
// at the back edge, between two chunky side cheek walls with capstones.

meta({
  name: 'stair-tile',
  license: 'CC0-1.0',
  title: 'Stone stair tile',
  description: 'Square 2 m flight of stone steps rising from ground height to a raised back edge between side walls with capstones. Knobs: rise, step count, side walls, step, wall and cap colours.',
  tags: ['tile', 'stairs', 'steps', 'staircase', 'stone', 'castle', 'terrain', 'grid', 'level design'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'town', 'castle', 'dungeon'],
  triangleBudget: 400,
});

const riseM = param('riseM', '1', { choices: ['0.5', '1', '2'], label: 'Rise (m)' });
const steps = param('steps', '6', { choices: ['4', '6', '8', '10'], label: 'Steps' });
const walls = param('walls', 'yes', { choices: ['yes', 'no'], label: 'Side walls' });
const step = param('step', '#a39d92', { label: 'Steps' });
const wall = param('wall', '#8c867c', { label: 'Walls' });
const cap = param('cap', '#c2bcb0', { label: 'Capstones' });

presets({
  sandstone: { step: '#d6b886', wall: '#b38f5e', cap: '#e4cfa2' },
  dungeon: { step: '#5f6166', wall: '#45474c', cap: '#77797e' },
  mossy: { step: '#9a9c8a', wall: '#6d7a55', cap: '#7f9a4f' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const H = Number(riseM.value) * 1000;
const n = Number(steps.value);
const hasWalls = walls.value === 'yes';
const ww = hasWalls ? 260 : 0;
const run = S / n;
const riseEach = H / n;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const st = assembly('stair-tile');
st.part('base', blk(-h, -h, 0, h, h, t).color(wall));
for (let i = 0; i < n; i++) {
  // Each step is a block running from its nose to the back edge; a small nose
  // overhang and a slightly lighter tread make the flight read clearly.
  const y0 = -h + i * run;
  const z1 = t + (i + 1) * riseEach;
  st.part(`step-${i + 1}`, blk(-h + ww - 2, y0, t - 2, h - ww + 2, h, z1).color(step));
}
if (hasWalls) {
  // Side cheek walls follow the flight in two stepped blocks, capped on top.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -h : h - ww;
    const x1 = x0 + ww;
    const s = side < 0 ? 'left' : 'right';
    st.part(`wall-${s}-low`, blk(x0, -h, t - 2, x1, 0, t + H * 0.55).color(wall));
    st.part(`wall-${s}-high`, blk(x0, -2, t - 2, x1, h, t + H + 120).color(wall));
    // Capstones overhang the stair side only, so the tile stays on its 2 m grid.
    const c0 = side < 0 ? x0 : x0 - 30;
    const c1 = side < 0 ? x1 + 30 : x1;
    st.part(`cap-${s}-low`, blk(c0, -h, t + H * 0.55 - 2, c1, 2, t + H * 0.55 + 70).color(cap));
    st.part(`cap-${s}-high`, blk(c0, -2, t + H + 118, c1, h, t + H + 190).color(cap));
  }
}

return st.model();
