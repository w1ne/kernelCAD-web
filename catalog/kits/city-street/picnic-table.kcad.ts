// Original kernelCAD low-poly picnic table: plank top and two plank benches on
// splayed A-frame legs with cross braces. Millimetres, Z up, long side on X.

meta({
  name: 'picnic-table',
  license: 'CC0-1.0',
  title: 'Picnic table',
  description: 'Park picnic table with attached benches on splayed A-frame legs. Knobs: length, top boards, wood and leg colours.',
  tags: ['picnic table', 'table', 'bench', 'park', 'garden', 'outdoor seating', 'street'],
  kit: 'city-street',
  category: 'furniture',
  origin: 'base',
  compat: ['outdoor', 'park', 'street', 'garden'],
  triangleBudget: 400,
});

const lengthMm = param('lengthMm', '1800', { choices: ['1500', '1800', '2400'], label: 'Length (mm)' });
const boards = param('boards', '4', { choices: ['3', '4', '5'], label: 'Top boards' });
const wood = param('wood', '#b07a45', { label: 'Planks' });
const legs = param('legs', '#8a5c33', { label: 'Legs and braces' });

presets({
  weathered: { wood: '#a69a88', legs: '#86796a' },
  painted: { wood: '#2f6b4a', legs: '#2a2c2e' },
});

const L = Number(lengthMm.value);
const n = Number(boards.value);
const topZ = 760;
const seatZ = 450;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const t = assembly('picnic-table');
// Top boards across 760 mm with small gaps.
const topW = 760;
const gap = 12;
const bw = (topW - gap * (n - 1)) / n;
for (let i = 0; i < n; i++) {
  const y = -topW / 2 + i * (bw + gap);
  t.part(`top-${i + 1}`, blk(-L / 2, y, topZ - 40, L / 2, y + bw, topZ).color(wood));
}
for (const side of [-1, 1]) {
  const s = side < 0 ? 'front' : 'back';
  t.part(`bench-${s}`, blk(-L / 2, side * 600 - 130, seatZ - 40, L / 2, side * 600 + 130, seatZ).color(wood));
}

// A-frames: two splayed legs, a cleat under the top and a long seat bearer.
const fx = L / 2 - 250;
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
for (const [i, x] of [[1, -fx], [2, fx]] as const) {
  t.part(`cleat-${i}`, blk(x - 25, -topW / 2 + 20, topZ - 90, x + 25, topZ / 2 - 20, topZ - 39).color(legs));
  t.part(`bearer-${i}`, blk(x - 25, -760, seatZ - 100, x + 25, 760, seatZ - 39).color(legs));
  for (const side of [-1, 1]) {
    const leg = sideProfile([[side * 740, 0], [side * 640, 0], [side * 200, topZ - 40], [side * 300, topZ - 40]], x - 22, 45);
    t.part(`leg-${i}-${side < 0 ? 'front' : 'back'}`, leg.color(legs));
  }
}

return t.model();
