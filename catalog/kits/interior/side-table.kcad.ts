// Original kernelCAD low-poly side table: a faceted round top on a tripod,
// a pedestal, or a square top on four legs with a lower shelf.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'side-table',
  license: 'CC0-1.0',
  title: 'Side table',
  description: 'Small end or side table: a round top on splayed tripod legs or a pedestal, or a square top with a lower shelf. Knobs: style, height, top and leg colours.',
  tags: ['side table', 'end table', 'lamp table', 'accent table', 'table', 'living room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office'],
  triangleBudget: 200,
});

const style = param('style', 'tripod', { choices: ['tripod', 'pedestal', 'square'], label: 'Style' });
const height = param('height', '550', { choices: ['450', '550', '650'], label: 'Height (mm)' });
const top = param('top', '#c69c6d', { label: 'Top' });
const legs = param('legs', '#2b2927', { label: 'Legs' });

presets({
  walnut: { top: '#5a3a27', legs: '#5a3a27' },
  marble: { top: '#e9e6df', legs: '#b8913f' },
  white: { top: '#f2f1ec', legs: '#c69c6d' },
});

const H = Number(height.value);
const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) {
    const a = rot + (2 * Math.PI * k) / n;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const strut = (r: number, a: [number, number, number], b: [number, number, number]) =>
  ngon(r, 4, Math.PI / 4).loft(ngon(r * 0.75, 4, Math.PI / 4), {
    planes: [{ plane: 'XY', origin: a }, { plane: 'XY', origin: b }],
    ruled: true,
  });
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const t = assembly('side-table');
const tt = 28;
if (style.value === 'square') {
  const w = 450;
  const lw = 36;
  t.part('top', blk(-w / 2, -w / 2, H - tt, w / 2, w / 2, H).color(top));
  t.part('shelf', blk(-w / 2 + lw - 1, -w / 2 + lw - 1, 120, w / 2 - lw + 1, w / 2 - lw + 1, 140).color(top));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
    const x = sx < 0 ? -w / 2 + 10 : w / 2 - 10 - lw;
    const y = sy < 0 ? -w / 2 + 10 : w / 2 - 10 - lw;
    t.part(`leg-${i + 1}`, blk(x, y, 0, x + lw, y + lw, H - tt + 1).color(legs));
  });
} else {
  const r = 240;
  t.part('top', ngon(r, 12).loft(ngon(r - 10, 12), { spacing: tt, ruled: true }).translate(0, 0, H - tt).color(top));
  if (style.value === 'tripod') {
    for (let i = 0; i < 3; i++) {
      const a = (2 * Math.PI * i) / 3 + Math.PI / 2;
      t.part(`leg-${i + 1}`, strut(18, [200 * Math.cos(a), 200 * Math.sin(a), 0], [80 * Math.cos(a), 80 * Math.sin(a), H - tt + 2]).color(legs));
    }
    t.part('hub', ngon(100, 6).extrude(24).translate(0, 0, H - tt - 22).color(legs));
  } else {
    t.part('foot', ngon(170, 8).loft(ngon(120, 8), { spacing: 30, ruled: true }).color(legs));
    t.part('column', ngon(35, 8).extrude(H - tt - 28).translate(0, 0, 29).color(legs));
  }
}

return t.model();
