// Original kernelCAD low-poly brick garden wall: a 2 m wall with end piers,
// stone coping and caps, and a scatter of proud accent bricks on both faces.
// Millimetres, Z up, runs along X; sections tile end to end.

meta({
  name: 'brick-wall-section',
  license: 'CC0-1.0',
  title: 'Brick wall section',
  description: 'Brick boundary wall section with end piers, stone coping and scattered accent bricks. Knobs: height, brick, accent brick and coping colours.',
  tags: ['wall', 'brick wall', 'garden wall', 'boundary', 'bricks', 'pier', 'yard', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'garden', 'yard'],
  triangleBudget: 400,
});

const heightMm = param('heightMm', '1200', { choices: ['900', '1200', '1800'], label: 'Height (mm)' });
const brick = param('brick', '#a4533a', { label: 'Brick' });
const brick2 = param('brick2', '#8a4230', { label: 'Accent bricks' });
const coping = param('coping', '#c9c3b6', { label: 'Coping' });

presets({
  yellow: { brick: '#c9a46a', brick2: '#b08a52' },
  painted: { brick: '#e8e4da', brick2: '#d8d2c4', coping: '#7d8288' },
});

const H = Number(heightMm.value);
const L = 2000;
const T = 230;
const P = 360;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const bw = assembly('brick-wall-section');
bw.part('wall', blk(-L / 2 + P - 10, -T / 2, 0, L / 2 - P + 10, T / 2, H).color(brick));
bw.part('coping', blk(-L / 2 + P - 10, -T / 2 - 30, H, L / 2 - P + 10, T / 2 + 30, H + 70).color(coping));
for (const [k, x] of [[1, -L / 2 + P / 2], [2, L / 2 - P / 2]] as const) {
  bw.part(`pier-${k}`, blk(x - P / 2, -P / 2, 0, x + P / 2, P / 2, H + 150).color(brick));
  bw.part(`pier-cap-${k}`, ngon((P + 80) / Math.SQRT2, 4, Math.PI / 4).loft(ngon(60, 4, Math.PI / 4), { spacing: 120, ruled: true }).translate(x, 0, H + 150).color(coping));
}
// Deterministic scatter of accent bricks on one course grid, alternating faces.
const course = 75;
const nb = Math.round(H / 100);
for (let i = 0; i < nb; i++) {
  const row = 1 + Math.floor((i * 7) % Math.floor(H / course - 1));
  const x = -L / 2 + P + 120 + ((i * 397) % (L - 2 * P - 240));
  const y = i % 2 === 0 ? -T / 2 - 10 : T / 2 - 2;
  bw.part(`accent-${i + 1}`, blk(x - 107, y, row * course, x + 107, y + 12, row * course + 65).color(brick2));
}

return bw.model();
