// Original kernelCAD low-poly plant stand: a mid-century stand of three
// splayed legs and a ring holding a pot with an upright snake plant of
// sword-shaped leaves. Millimetres, Z up, standing on z = 0 centred on
// x = y = 0.

meta({
  name: 'plant-stand',
  license: 'CC0-1.0',
  title: 'Plant stand with snake plant',
  description: 'Mid-century plant stand on three splayed legs holding a pot with an upright snake plant. Knobs: stand height, leaves, stand, pot, leaf and leaf-edge colours.',
  tags: ['plant stand', 'snake plant', 'sansevieria', 'houseplant', 'potted plant', 'plant', 'mid-century', 'decor'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office'],
  triangleBudget: 400,
});

const height = param('height', '300', { choices: ['200', '300', '500'], label: 'Stand height (mm)' });
const leafCount = param('leafCount', '8', { choices: ['6', '8', '10'], label: 'Leaves' });
const stand = param('stand', '#a07548', { label: 'Stand' });
const pot = param('pot', '#efeee9', { label: 'Pot' });
const leaves = param('leaves', '#3f6a3a', { label: 'Leaves' });
const edge = param('edge', '#b8c46a', { label: 'Variegated leaves' });

presets({
  black: { stand: '#2b2927', pot: '#c0683f' },
  natural: { stand: '#d0a874', pot: '#5c7a8a' },
});

const sh = Number(height.value);
const n = Number(leafCount.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const strut = (r: number, a: [number, number, number], b: [number, number, number]) =>
  ngon(r, 4).loft(ngon(r * 0.8, 4), { planes: [{ plane: 'XY', origin: a }, { plane: 'XY', origin: b }], ruled: true });

const p = assembly('plant-stand');
const potR = 130;
const potH = 230;
for (let i = 0; i < 3; i++) {
  const a = (2 * Math.PI * i) / 3 + Math.PI / 2;
  p.part(`leg-${i + 1}`, strut(14, [230 * Math.cos(a), 230 * Math.sin(a), 0], [(potR - 10) * Math.cos(a), (potR - 10) * Math.sin(a), sh + 40]).color(stand));
}
p.part('ring', ngon(potR + 14, 9).extrude(24).subtract(ngon(potR - 6, 9).extrude(40).translate(0, 0, -8)).translate(0, 0, sh + 10).color(stand));
// Pot sits in the ring, its bottom a little below the ring.
const pz = sh - 30;
p.part('pot', ngon(potR * 0.85, 9).loft(ngon(potR, 9), { spacing: potH, ruled: true }).translate(0, 0, pz).color(pot));
// Snake plant: upright sword leaves, fanned slightly, alternating colours.
const sword = (L: number, w: number) => extrudePolygon([[-w / 2, 0], [w / 2, 0], [w * 0.55, L * 0.55], [0, L], [-w * 0.55, L * 0.55]], 10)
  .translate(0, 0, -5).rotateX(90);
for (let i = 0; i < n; i++) {
  const a = (360 * i) / n + (i % 2) * 17;
  const L = 520 + 160 * Math.sin(i * 1.9);
  const tilt = 6 + 7 * (i % 3);
  const r = i % 2 === 0 ? 30 : 55;
  const rad = (a * Math.PI) / 180;
  const leaf = sword(L, 60).rotateZ(90).rotateY(tilt).rotateZ(a).translate(r * Math.cos(rad), r * Math.sin(rad), pz + potH - 30);
  p.part(`leaf-${i + 1}`, leaf.color(i % 3 === 1 ? edge : leaves));
}

return p.model();
