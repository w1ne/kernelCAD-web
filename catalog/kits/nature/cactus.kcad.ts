// Original kernelCAD low-poly saguaro cactus: an octagonal column with a
// tapered crown and L-shaped arms, plus an optional bloom on top.

meta({
  name: 'cactus',
  license: 'CC0-1.0',
  title: 'Saguaro cactus',
  description: 'Desert saguaro cactus with a faceted column and upturned arms. Knobs: height, arm count, bloom, body and flower colours.',
  tags: ['cactus', 'saguaro', 'succulent', 'desert', 'western', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert'],
  triangleBudget: 300,
});

const heightM = param('heightM', '4', { choices: ['2', '4', '6'], label: 'Height (m)' });
const arms = param('arms', '2', { choices: ['0', '1', '2', '3'], label: 'Arms' });
const bloom = param('bloom', 'yes', { choices: ['yes', 'no'], label: 'Bloom' });
const body = param('body', '#4f8a4a', { label: 'Body' });
const flower = param('flower', '#f2e6b8', { label: 'Bloom' });

presets({
  dusty: { body: '#7a9a5e' },
  pinkBloom: { flower: '#e86a9a' },
});

const h = Number(heightM.value) * 1000;
const na = Number(arms.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Upright column with a tapered dome: three rings, last one small.
const column = (r: number, len: number, n = 8) =>
  ngon(r, n).loft([ngon(r, n), ngon(r * 0.85, n, Math.PI / n), ngon(r * 0.35, n)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, len - r * 1.1] },
      { plane: 'XY', origin: [0, 0, len - r * 0.45] },
      { plane: 'XY', origin: [0, 0, len] },
    ],
    ruled: true,
  });

const cactus = assembly('cactus');
const R = h * 0.065;
cactus.part('trunk', column(R, h).color(body));

for (let i = 0; i < na; i++) {
  const az = [0, 180, 90][i];
  const z = h * [0.4, 0.52, 0.62][i];
  const reach = R * (3.3 - 0.4 * i);
  const ar = R * 0.7;
  const up = h * [0.32, 0.26, 0.2][i];
  const elbow = ngon(ar, 6).extrude(reach).rotateY(90).rotateZ(az).translate(0, 0, z);
  const c = Math.cos((az * Math.PI) / 180);
  const s = Math.sin((az * Math.PI) / 180);
  const riser = column(ar, up, 6).translate((reach - ar * 0.6) * c, (reach - ar * 0.6) * s, z - ar * 0.8);
  cactus.part(`arm-${i + 1}`, elbow.color(body));
  cactus.part(`arm-${i + 1}-up`, riser.color(body));
}

if (bloom.value === 'yes') {
  const fr = R * 0.6;
  cactus.part('bloom', ngon(fr, 5).loft(ngon(fr * 0.6, 5, Math.PI / 5), { spacing: fr * 0.8, ruled: true }).translate(0, 0, h - fr * 0.3).color(flower));
}

return cactus.model();
