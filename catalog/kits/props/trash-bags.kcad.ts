// Original kernelCAD low-poly trash bag pile: lumpy bin bags (irregular
// ruled lofts) slumped against each other, each tied off with a twisted
// neck and two knot ears. Millimetres, Z up, base on z = 0 centred on
// x = y = 0.

meta({
  name: 'trash-bags',
  license: 'CC0-1.0',
  title: 'Trash bags',
  description: 'Pile of tied black bin bags slumped together on the kerb or in an alley. Knobs: count, bag, second bag and tie colours.',
  tags: ['trash', 'trash bags', 'garbage', 'bin bags', 'rubbish', 'litter', 'alley', 'street', 'urban'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'alley', 'urban', 'post-apocalyptic', 'industrial'],
  triangleBudget: 520,
});

const count = param('count', '3', { choices: ['1', '3', '5'], label: 'Bags' });
const bag = param('bag', '#2a2b2e', { label: 'Bags' });
const bag2 = param('bag2', '#3a4a6a', { label: 'Second bag' });
const tie = param('tie', '#d0a030', { label: 'Ties' });

presets({
  green: { bag: '#2f4a2f', bag2: '#4a4a4a' },
  white: { bag: '#e4e4e0', bag2: '#c8c8c0', tie: '#c8302a' },
});

const n = Number(count.value);
const sides = 7;
const jit = (k: number, salt: number) => 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233));
const ring = (r: number, salt: number, rot = 0) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / sides;
    const rr = r * jit(k, salt);
    return [rr * Math.cos(a), rr * 0.85 * Math.sin(a)] as const;
  };
  const [x0, y0] = pt(0);
  let p = path().moveTo(x0, y0);
  for (let k = 1; k < sides; k++) {
    const [x, y] = pt(k);
    p = p.lineTo(x, y);
  }
  return p.close();
};

const tb = assembly('trash-bags');
// [x, y, size, yaw, lean x]
const spots: [number, number, number, number, number][] = [
  [0, 0, 1, 0, 0], [-330, 90, 0.85, 40, -60], [300, 120, 0.8, -30, 60], [-150, -300, 0.7, 70, -30], [190, -280, 0.75, 15, 40],
];
for (let i = 0; i < n; i++) {
  const [x, y, s, yaw, lean] = spots[i];
  const r = 260 * s;
  const h = 520 * s;
  const off = Math.PI / sides;
  const salt = i * 5;
  const body = ring(r * 0.9, salt + 1).loft([ring(r * 1.1, salt + 2, off), ring(r * 0.95, salt + 3), ring(r * 0.25, salt + 4, off)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, h * 0.3] },
      { plane: 'XY', origin: [lean * 0.4, 0, h * 0.62] },
      { plane: 'XY', origin: [lean, 0, h * 0.86] },
    ],
    ruled: true,
  });
  const place = (sh: Shape) => sh.rotateZ(yaw).translate(x, y, 0);
  tb.part(`bag-${i + 1}`, place(body).color(i % 2 === 1 ? bag2 : bag));
  // Knot: a short twist and two ears splayed in a V.
  tb.part(`tie-${i + 1}`, place(ring(r * 0.18, salt + 7).extrude(h * 0.08).translate(lean, 0, h * 0.84)).color(tie));
  tb.part(`ears-${i + 1}`, place(extrudePolygon([[-r * 0.08, -h * 0.06], [r * 0.08, -h * 0.06], [r * 0.34, h * 0.13], [r * 0.2, h * 0.17], [0, h * 0.05], [-r * 0.2, h * 0.17], [-r * 0.34, h * 0.13]], 30 * s)
    .rotateX(90).translate(lean, 15 * s, h * 0.95)).color(i % 2 === 1 ? bag2 : bag));
}

return tb.model();
