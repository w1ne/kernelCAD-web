// Original kernelCAD low-poly fiddle-leaf fig: a tall houseplant with a slim
// faceted trunk and large violin-shaped leaves spiralling up the top half,
// in a tapered basket or ceramic pot. Millimetres, Z up, standing on z = 0
// centred on x = y = 0.

meta({
  name: 'fiddle-leaf-fig',
  license: 'CC0-1.0',
  title: 'Fiddle-leaf fig',
  description: 'Tall indoor fiddle-leaf fig tree with large violin-shaped leaves on a slim trunk in a basket pot. Knobs: height, leaf count, pot, leaf, trunk and soil colours.',
  tags: ['fiddle leaf fig', 'ficus', 'houseplant', 'indoor tree', 'plant', 'potted plant', 'greenery', 'decor'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'office', 'bedroom'],
  triangleBudget: 600,
});

const height = param('height', '1.6', { choices: ['1.2', '1.6', '2'], label: 'Height (m)' });
const leafCount = param('leafCount', '12', { choices: ['8', '12', '15'], label: 'Leaves' });
const pot = param('pot', '#c9b38a', { label: 'Pot' });
const leaves = param('leaves', '#3f7a32', { label: 'Leaves' });
const trunk = param('trunk', '#7a5a3a', { label: 'Trunk' });
const soil = param('soil', '#3e2c20', { label: 'Soil' });

presets({
  white: { pot: '#efeee9' },
  terracotta: { pot: '#b9653f', leaves: '#4a7a35' },
  black: { pot: '#2b2d30' },
});

const H = Number(height.value) * 1000;
const n = Number(leafCount.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const f = assembly('fiddle-leaf-fig');
const potH = 340;
const potR = 190;
f.part('pot', ngon(potR * 0.78, 8).loft([ngon(potR, 8), ngon(potR * 1.06, 8)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, potH - 40] },
    { plane: 'XY', origin: [0, 0, potH] },
  ],
  ruled: true,
}).color(pot));
f.part('soil', ngon(potR * 0.98, 8).extrude(10).translate(0, 0, potH - 30).color(soil));
// Trunk: a slim tapered pentagon with a slight lean.
const top = H - 60;
f.part('trunk', ngon(24, 5).loft(ngon(12, 5), {
  planes: [
    { plane: 'XY', origin: [0, 0, potH - 40] },
    { plane: 'XY', origin: [30, -20, top] },
  ],
  ruled: true,
}).color(trunk));
// Violin-shaped leaf: wide rounded tip, pinched waist, narrow base.
const leafL = 300;
const leafW = 200;
const outline: [number, number][] = [
  [0, 0], [leafW * 0.28, leafL * 0.25], [leafW * 0.33, leafL * 0.48], [leafW * 0.5, leafL * 0.78],
  [leafW * 0.2, leafL], [-leafW * 0.2, leafL], [-leafW * 0.5, leafL * 0.78], [-leafW * 0.33, leafL * 0.48],
  [-leafW * 0.28, leafL * 0.25],
];
const leaf = (s: number) => extrudePolygon(outline.map(([x, y]) => [x * s, y * s] as [number, number]), 8).translate(0, 0, -4).rotateX(90);
const z0 = potH + (H - potH) * 0.28;
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  const z = z0 + (top - z0) * t;
  const yaw = i * 137.5;
  const s = 1.25 - 0.45 * t; // smaller leaves near the top
  // Lower leaves splay out more; upper leaves point upward.
  const tilt = 70 - 45 * t;
  const cx = 30 * ((z - potH + 40) / (top - potH + 40));
  const cy = -20 * ((z - potH + 40) / (top - potH + 40));
  f.part(`leaf-${i + 1}`, leaf(s).rotateY(tilt).rotateZ(yaw).translate(cx, cy, z).color(leaves));
}
f.part('top-leaf', leaf(0.6).rotateY(12).translate(30, -20, top - 30).color(leaves));

return f.model();
