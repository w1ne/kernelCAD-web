// Original kernelCAD low-poly dead tree: a gnarled bare trunk with forking
// faceted limbs and twigs, each a tapered ruled loft of a pentagon.

meta({
  name: 'dead-tree',
  title: 'Dead tree',
  description: 'Bare leafless dead tree with a forked trunk, angular branches and twigs. Knobs: height, branch count, twigs on or off, bark colour.',
  tags: ['tree', 'dead', 'bare', 'leafless', 'spooky', 'swamp', 'winter', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'desert', 'swamp'],
  triangleBudget: 500,
});

const heightM = param('heightM', '5', { choices: ['3', '5', '7'], label: 'Height (m)' });
const branches = param('branches', '4', { choices: ['3', '4', '5', '6'], label: 'Branches' });
const twigs = param('twigs', 'yes', { choices: ['yes', 'no'], label: 'Twigs' });
const bark = param('bark', '#6e6259', { label: 'Bark' });

presets({
  charred: { bark: '#2f2a27' },
  bleached: { bark: '#b9b1a3' },
});

const h = Number(heightM.value) * 1000;
const nb = Number(branches.value);

const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (tilt: number, az: number) =>
  [Math.sin(rad(tilt)) * Math.cos(rad(az)), Math.sin(rad(tilt)) * Math.sin(rad(az)), Math.cos(rad(tilt))];

const tree = assembly('dead-tree');
let id = 0;
const limb = (o: number[], r0: number, r1: number, len: number, tilt: number, az: number) => {
  id += 1;
  tree.part(
    `limb-${id}`,
    ngon(r0, 5).loft(ngon(r1, 5), { spacing: len, ruled: true }).rotateY(tilt).rotateZ(az).translate(o[0], o[1], o[2]).color(bark),
  );
  const d = dir(tilt, az);
  return (f: number) => [o[0] + d[0] * len * f, o[1] + d[1] * len * f, o[2] + d[2] * len * f];
};

// Trunk in two kinked pieces, then a fork at the top.
const at1 = limb([0, 0, 0], h * 0.045, h * 0.032, h * 0.38, 0, 0);
// Root flare: a squat wide frustum around the trunk foot.
id += 1;
tree.part('roots', ngon(h * 0.075, 5).loft(ngon(h * 0.04, 5), { spacing: h * 0.07, ruled: true }).rotateZ(36).color(bark));
const top = at1(0.97);
const at2 = limb(top, h * 0.033, h * 0.016, h * 0.42, 10, 160);
limb(at2(0.92), h * 0.017, h * 0.006, h * 0.22, 28, 120);

for (let i = 0; i < nb; i++) {
  const t = (i + 0.5) / nb;
  const az = i * 137 + 30;
  const from = t < 0.5 ? at1(0.55 + t * 0.8) : at2(0.15 + (t - 0.5) * 1.3);
  const len = h * (0.42 - 0.16 * t);
  const tilt = 58 + (i % 2) * 14;
  const along = limb(from, h * 0.018 * (1 - 0.4 * t), h * 0.005, len, tilt, az);
  if (twigs.value === 'yes') {
    limb(along(0.5), h * 0.007, h * 0.002, len * 0.45, tilt - 32, az + 40);
    limb(along(0.75), h * 0.006, h * 0.002, len * 0.35, tilt - 10, az - 45);
  }
}

return tree.model();
