// Original kernelCAD low-poly agave: a rosette of thick pointed triangular
// leaves, upright in the middle and splayed at the rim, with an optional tall
// flowering stalk topped by yellow clusters.

meta({
  name: 'agave',
  license: 'CC0-1.0',
  title: 'Agave',
  description: 'Desert agave rosette of thick spiky leaves with an optional tall flowering stalk, for desert and Mexican scenes. Knobs: size, leaves, bloom stalk, leaf, tip, stalk and flower colours.',
  tags: ['agave', 'succulent', 'century plant', 'desert', 'mexico', 'tequila', 'dry garden', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'garden', 'beach'],
  triangleBudget: 460,
});

const size = param('size', '1', { choices: ['0.5', '1', '1.6'], label: 'Width (m)' });
const count = param('count', '14', { choices: ['10', '14', '18'], label: 'Leaves' });
const bloom = param('bloom', 'no', { choices: ['no', 'yes'], label: 'Flower stalk' });
const leaf = param('leaf', '#7a9e8a', { label: 'Leaves' });
const stalk = param('stalk', '#8a7a4a', { label: 'Flower stalk' });
const flower = param('flower', '#e8c23a', { label: 'Flowers' });

presets({
  blue: { leaf: '#6a8ea8' },
  green: { leaf: '#5a8a3a' },
  blooming: { bloom: 'yes' },
});

const w = Number(size.value) * 1000;
const n = Number(count.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Thick leaf: a flattened triangle section tapering to a sharp tip along +Z.
const blade = (len: number, wd: number) => {
  const tri = (k: number) => path().moveTo(-wd * k, 0).lineTo(wd * k, 0).lineTo(0, wd * 0.6 * k).close();
  return tri(1).loft([tri(1.15), tri(0.05)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, len * 0.35] },
      { plane: 'XY', origin: [0, 0, len] },
    ],
    ruled: true,
  });
};

const plant = assembly('agave');
const R = w / 2;
plant.part('core', ngon(R * 0.22, 6).loft(ngon(R * 0.1, 6), { spacing: w * 0.1, ruled: true }).color(leaf));
// Leaves: the cup side faces inward (the triangle's apex points to +Y,
// which rotateX tips toward the centre), so the rosette reads as a bowl.
// Each leaf starts a little above the ground so its tilted base never dips
// below z = 0.
for (let i = 0; i < n; i++) {
  const outer = i < n * 0.55;
  const tilt = outer ? 62 + 8 * (i % 2) : 22 + 10 * (i % 3);
  const len = w * (outer ? 0.55 : 0.5);
  const wd = w * (outer ? 0.07 : 0.06);
  const az = (i * 137.5) % 360;
  const lift = wd * 0.7 + 5;
  plant.part(`leaf-${i + 1}`, blade(len, wd).rotateX(-tilt).rotateZ(az).translate(0, 0, lift).color(leaf));
}

if (bloom.value === 'yes') {
  const sh = w * 3;
  plant.part('stalk', ngon(w * 0.03, 5).loft(ngon(w * 0.015, 5), { spacing: sh, ruled: true }).translate(0, 0, w * 0.1).color(stalk));
  for (let k = 0; k < 4; k++) {
    const z = w * 0.1 + sh * (0.6 + 0.12 * k);
    const az = k * 95;
    const bl = w * (0.35 - 0.06 * k);
    plant.part(`branch-${k + 1}`, ngon(w * 0.012, 4).extrude(bl).rotateY(70).rotateZ(az).translate(0, 0, z).color(stalk));
    const a = (az * Math.PI) / 180;
    const tx = bl * Math.sin((70 * Math.PI) / 180);
    const tz = z + bl * Math.cos((70 * Math.PI) / 180);
    const fr = w * 0.08;
    plant.part(`flowers-${k + 1}`, ngon(fr * 0.6, 5).loft([ngon(fr, 5, 0.6), ngon(fr * 0.4, 5)], {
      planes: [
        { plane: 'XY', origin: [tx * Math.cos(a), tx * Math.sin(a), tz - fr * 0.2] },
        { plane: 'XY', origin: [tx * Math.cos(a), tx * Math.sin(a), tz + fr * 0.4] },
        { plane: 'XY', origin: [tx * Math.cos(a), tx * Math.sin(a), tz + fr] },
      ],
      ruled: true,
    }).color(flower));
  }
}

return plant.model();
