// Original kernelCAD low-poly tree stump: a flared faceted stump with a pale
// sawn top, heartwood ring and wedge-shaped surface roots.

meta({
  name: 'tree-stump',
  title: 'Tree stump',
  description: 'Sawn-off tree stump with flared roots and a pale cut top showing a heartwood ring. Knobs: diameter, height, root count, bark, cut wood and heartwood colours.',
  tags: ['stump', 'tree stump', 'wood', 'chopped', 'forest', 'lumber', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow'],
  triangleBudget: 260,
});

const diameter = param('diameter', '0.6', { choices: ['0.4', '0.6', '0.9'], label: 'Diameter (m)' });
const height = param('height', 'medium', { choices: ['low', 'medium', 'tall'], label: 'Height' });
const roots = param('roots', '4', { choices: ['3', '4', '5', '6'], label: 'Roots' });
const bark = param('bark', '#6a4a2e', { label: 'Bark' });
const wood = param('wood', '#dcb67e', { label: 'Cut wood' });
const heart = param('heart', '#a9763f', { label: 'Heartwood ring' });

presets({
  weathered: { wood: '#b8a88e', heart: '#8f7f66', bark: '#5d5148' },
  mossy: { bark: '#4d6a33' },
});

const r = (Number(diameter.value) * 1000) / 2;
const h = r * (height.value === 'low' ? 0.6 : height.value === 'tall' ? 2 : 1.1);
const nr = Number(roots.value);
const s = 8;

const ngon = (rr: number, n: number, rot = 0) => {
  let p = path().moveTo(rr * Math.cos(rot), rr * Math.sin(rot));
  for (let k = 1; k < n; k++) {
    const a = rot + (2 * Math.PI * k) / n;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};

const stump = assembly('tree-stump');
// Concentric pieces that do not overlap: a bark shell, a pale sapwood tube
// and a heartwood core, all flush on top, so no hidden faces stack up.
const sapR = r * 0.78;
const heartR = r * 0.35;
const core = (rr: number, n = s) => ngon(rr, n).extrude(h + 40).translate(0, 0, -20);
stump.part(
  'trunk',
  ngon(r * 1.2, s).loft([ngon(r, s), ngon(r * 0.95, s)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, h * 0.3] },
      { plane: 'XY', origin: [0, 0, h] },
    ],
    ruled: true,
  }).subtract(core(sapR)).color(bark),
);
stump.part('cut', ngon(sapR, s).extrude(h).subtract(core(heartR, 6)).color(wood));
stump.part('heart', ngon(heartR, 6).extrude(h).color(heart));

// Wedge root: a triangle profile in XZ extruded sideways, swung around Z.
for (let i = 0; i < nr; i++) {
  const az = (360 * i) / nr + 20;
  const len = r * (0.8 + 0.25 * Math.sin(i * 2.1));
  const rh = h * 0.45;
  const root = extrudePolygon([[r * 0.6, 0], [r * 0.9 + len, 0], [r * 0.7, rh]], r * 0.36)
    .translate(0, 0, -r * 0.18)
    .rotateX(90)
    .rotateZ(az);
  stump.part(`root-${i + 1}`, root.color(bark));
}

return stump.model();
