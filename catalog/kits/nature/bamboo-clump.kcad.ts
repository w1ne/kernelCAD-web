// Original kernelCAD low-poly bamboo clump: tall slightly leaning culms with
// darker node rings and narrow leaf blades fanning near the tops.

meta({
  name: 'bamboo-clump',
  license: 'CC0-1.0',
  title: 'Bamboo clump',
  description: 'Clump of tall bamboo culms with darker node rings and narrow leaves near the tops, for Asian gardens and jungle scenes. Knobs: height, culm count, culm, node and leaf colours.',
  tags: ['bamboo', 'grove', 'cane', 'grass', 'asian garden', 'zen', 'jungle', 'tropical', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'jungle', 'tropical', 'forest'],
  triangleBudget: 600,
});

const heightM = param('heightM', '5', { choices: ['3', '5', '7'], label: 'Height (m)' });
const count = param('count', '7', { choices: ['5', '7', '8'], label: 'Culms' });
const culm = param('culm', '#8fb04a', { label: 'Culms' });
const node = param('node', '#5f7a2e', { label: 'Node rings' });
const leaves = param('leaves', '#4f9a3a', { label: 'Leaves' });

presets({
  golden: { culm: '#d4b44a', node: '#9a7a2e' },
  black: { culm: '#3a3530', node: '#1f1c1a', leaves: '#3f7a34' },
  dry: { leaves: '#b8a64a' },
});

const h = Number(heightM.value) * 1000;
const n = Number(count.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blade = (len: number, w: number) => extrudePolygon([[0, 0], [w, len * 0.25], [w * 0.4, len * 0.8], [0, len]], 6).translate(0, 0, -3).rotateX(90);

const clump = assembly('bamboo-clump');
const r = Math.max(25, h * 0.009);
for (let i = 0; i < n; i++) {
  const a = i * 2.39996;
  const d = i === 0 ? 0 : 90 + 70 * Math.sqrt(i);
  const x = d * Math.cos(a);
  const y = d * Math.sin(a);
  const ch = h * (0.75 + 0.25 * ((i * 0.618) % 1));
  const lean = i === 0 ? 0 : 4 + (i % 3) * 2;
  const az = (a * 180) / Math.PI;
  // Lean outward: tilt about Y toward +X, then spin to this culm's direction;
  // lift by the tilted base's dip so the lowest corner stays on z = 0.
  const lift = r * Math.sin((lean * Math.PI) / 180);
  const orient = (s: Shape) => s.rotateY(lean).rotateZ(az).translate(x, y, lift);
  clump.part(`culm-${i + 1}`, orient(ngon(r, 5).loft(ngon(r * 0.7, 5), { spacing: ch, ruled: true })).color(culm));
  for (let k = 1; k <= 2; k++) {
    const z = ch * (0.22 + 0.3 * k);
    clump.part(`node-${i + 1}-${k}`, orient(ngon(r * 1.18, 5, 0.3).extrude(r * 0.9).translate(0, 0, z)).color(node));
  }
  // Two leaf blades near the top, angled out and down from the culm.
  for (let k = 0; k < 2; k++) {
    const z = ch * (0.78 + 0.12 * k);
    const leaf = blade(h * 0.12, h * 0.02).rotateY(105 + k * 10).rotateZ(k * 160 + i * 40).translate(0, 0, z);
    clump.part(`leaf-${i + 1}-${k + 1}`, orient(leaf).color(leaves));
  }
}

return clump.model();
