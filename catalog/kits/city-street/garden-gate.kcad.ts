// Original kernelCAD low-poly garden gate: two square posts with pyramid caps
// and a picket gate with pointed boards on two rails and a diagonal brace,
// iron hinges and a latch; it can stand closed or ajar. Millimetres, Z up,
// gate spans X, hinged on the -X post.

meta({
  name: 'garden-gate',
  license: 'CC0-1.0',
  title: 'Garden gate',
  description: 'Wooden picket garden gate between two capped posts with braced rails, hinges and latch, closed or ajar. Knobs: open state, pickets, gate, post and iron colours.',
  tags: ['gate', 'garden gate', 'picket gate', 'fence', 'entrance', 'garden', 'yard', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'garden', 'yard', 'street'],
  triangleBudget: 360,
});

const state = param('state', 'closed', { choices: ['closed', 'ajar', 'open'], label: 'Gate' });
const pickets = param('pickets', '7', { choices: ['5', '7', '9'], label: 'Pickets' });
const wood = param('wood', '#efeee9', { label: 'Gate' });
const posts = param('posts', '#d8d6cf', { label: 'Posts' });
const iron = param('iron', '#2a2c2e', { label: 'Hinges and latch' });

presets({
  natural: { wood: '#b07a45', posts: '#8a5c33' },
  green: { wood: '#2f6b4a', posts: '#1f4a36' },
});

const n = Number(pickets.value);
const gw = 1000;
const gh = 1000;
const swing = state.value === 'open' ? -80 : state.value === 'ajar' ? -30 : 0;
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
// Straight bar in the XZ plane at depth y, from (x0, z0) to (x1, z1), square section t.
const bar = (x0: number, z0: number, x1: number, z1: number, t: number, y = 0) => {
  const len = Math.hypot(x1 - x0, z1 - z0) + t;
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

const gg = assembly('garden-gate');
for (const [k, x] of [[1, -gw / 2 - 70], [2, gw / 2 + 70]] as const) {
  gg.part(`post-${k}`, blk(x - 55, -55, 0, x + 55, 55, 1250).color(posts));
  gg.part(`post-cap-${k}`, ngon(95, 4, Math.PI / 4).loft(ngon(8, 4, Math.PI / 4), { spacing: 90, ruled: true }).translate(x, 0, 1250).color(posts));
}
// Gate leaf authored with the hinge line at x = 0, then swung and moved.
const leaf = (s: Shape) => s.rotateZ(swing).translate(-gw / 2 - 10, 0, 0);
const pw = (gw - 40) / n;
for (let i = 0; i < n; i++) {
  const x = 20 + i * pw + 10;
  const w = pw - 20;
  const picket = extrudePolygon([[0, 100], [w, 100], [w, gh], [w / 2, gh + 70], [0, gh]], 22).rotateX(90).translate(x, -10, 0);
  gg.part(`picket-${i + 1}`, leaf(picket).color(wood));
}
gg.part('rail-low', leaf(blk(10, 10, 230, gw - 10, 40, 330)).color(wood));
gg.part('rail-high', leaf(blk(10, 10, 780, gw - 10, 40, 880)).color(wood));
gg.part('brace', leaf(bar(60, 300, gw - 60, 810, 70, 28)).color(wood));
for (const [k, z] of [[1, 260], [2, 810]] as const) {
  gg.part(`hinge-${k}`, leaf(blk(-30, 38, z, 240, 48, z + 40)).color(iron));
}
gg.part('latch', blk(gw / 2 + 10, -70, 820, gw / 2 + 60, -50, 880).color(iron));

return gg.model();
