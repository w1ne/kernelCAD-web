// Original kernelCAD low-poly spruce: a narrow spire of stacked star-section
// tiers (ruled lofts of a spiky star to a point), each turned half a spike.

meta({
  name: 'spruce-tree',
  license: 'CC0-1.0',
  title: 'Spruce tree',
  description: 'Tall narrow spruce built from stacked spiky star-section tiers, a slimmer and more jagged conifer than the pine. Knobs: height, tiers, spikes, bark and needle colours.',
  tags: ['tree', 'spruce', 'fir', 'conifer', 'evergreen', 'christmas tree', 'forest', 'mountain', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'mountain'],
  triangleBudget: 450,
});

const heightM = param('heightM', '7', { choices: ['4', '7', '10', '14'], label: 'Height (m)' });
const tiers = param('tiers', '5', { choices: ['4', '5', '6'], label: 'Tiers' });
const spikes = param('spikes', '7', { choices: ['6', '7', '8'], label: 'Spikes per tier' });
const bark = param('bark', '#5c4030', { label: 'Bark' });
const needles = param('needles', '#2c5e43', { label: 'Needles' });

presets({
  blue: { needles: '#4d7a80' },
  snowy: { needles: '#e3ebef', bark: '#4a3a2e' },
  dark: { needles: '#1f4a35' },
});

const h = Number(heightM.value) * 1000;
const n = Number(tiers.value);
const k = Number(spikes.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let i = 1; i < s; i++) {
    const a = rot + (2 * Math.PI * i) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Star cross-section: k spikes at radius r, notches at 55 %.
const star = (r: number, rot: number) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let i = 1; i < 2 * k; i++) {
    const a = rot + (Math.PI * i) / k;
    const rr = i % 2 === 0 ? r : r * 0.55;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};

const tree = assembly('spruce-tree');
tree.part('trunk', ngon(h * 0.03, 6).loft(ngon(h * 0.018, 6), { spacing: h * 0.4, ruled: true }).color(bark));

const bottom = h * 0.1;
const tierH = ((h - bottom) / n) * 1.9;
for (let i = 0; i < n; i++) {
  const t = i / n;
  const z0 = bottom + i * ((h - bottom - tierH) / (n - 1));
  const r = h * 0.17 * (1 - t * 0.8);
  const rot = (i % 2) * (Math.PI / k);
  const tier = star(r, rot).loft(star(r * 0.06, rot), { spacing: i === n - 1 ? tierH : tierH * 0.85, ruled: true }).translate(0, 0, z0);
  tree.part(`tier-${i + 1}`, tier.color(needles));
}

return tree.model();
