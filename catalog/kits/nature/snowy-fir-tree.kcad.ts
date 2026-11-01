// Original kernelCAD low-poly snowy fir: stacked faceted cone tiers, each
// with a white snow cap resting on its upper slope, and an optional snow
// drift round the foot.

meta({
  name: 'snowy-fir-tree',
  license: 'CC0-1.0',
  title: 'Snowy fir tree',
  description: 'Winter fir tree of stacked cone tiers with snow caps on every tier and an optional snow drift at its foot, for winter and Christmas scenes. Knobs: height, tiers, drift, needle, snow and bark colours.',
  tags: ['tree', 'fir', 'christmas tree', 'conifer', 'evergreen', 'snow', 'winter', 'snowy', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'mountain', 'snow', 'winter'],
  triangleBudget: 450,
});

const heightM = param('heightM', '5', { choices: ['3', '5', '8'], label: 'Height (m)' });
const tiers = param('tiers', '4', { choices: ['3', '4', '5'], label: 'Tiers' });
const drift = param('drift', 'yes', { choices: ['yes', 'no'], label: 'Snow drift' });
const needles = param('needles', '#2f5e48', { label: 'Needles' });
const snow = param('snow', '#eef3f7', { label: 'Snow' });
const bark = param('bark', '#5a4232', { label: 'Bark' });

presets({
  frosty: { needles: '#5a7f78' },
  dark: { needles: '#1f4434' },
});

const h = Number(heightM.value) * 1000;
const n = Number(tiers.value);
const s = 8;

const ngon = (r: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const cone = (r0: number, r1: number, z0: number, z1: number, rot: number) =>
  ngon(r0, rot).loft(ngon(r1, rot), { spacing: z1 - z0, ruled: true }).translate(0, 0, z0);

const tree = assembly('snowy-fir-tree');
tree.part('trunk', ngon(h * 0.035).extrude(h * 0.25).color(bark));

const base = h * 0.14;
const tierH = ((h - base) / n) * 1.7;
for (let i = 0; i < n; i++) {
  const z0 = base + i * ((h - base - tierH) / (n - 1));
  const r = h * 0.26 * (1 - (i / n) * 0.75);
  const rot = (i % 2) * (Math.PI / s);
  const tipR = r * 0.03;
  tree.part(`tier-${i + 1}`, cone(r, tipR, z0, z0 + tierH, rot).color(needles));
  // Snow cap: from part way up the band of this tier that shows below the
  // next tier, to the tip, 4 % proud of the cone, with a jutting bottom rim.
  const step = (h - base - tierH) / (n - 1);
  const f = i === n - 1 ? 0.45 : (step * 0.4) / tierH;
  const zc = z0 + tierH * f;
  const rc = r + (tipR - r) * f;
  tree.part(`snow-${i + 1}`, ngon(rc * 1.08, rot).loft([ngon(rc * 1.04, rot), ngon(tipR * 1.6, rot)], {
    planes: [
      { plane: 'XY', origin: [0, 0, zc - tierH * 0.04] },
      { plane: 'XY', origin: [0, 0, zc] },
      { plane: 'XY', origin: [0, 0, z0 + tierH * 1.01] },
    ],
    ruled: true,
  }).color(snow));
}

if (drift.value === 'yes') {
  const dr = h * 0.3;
  tree.part('drift', ngon(dr, 0.2).loft([ngon(dr * 0.6, 0.6), ngon(h * 0.05, 0.2)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, h * 0.04] },
      { plane: 'XY', origin: [0, 0, h * 0.07] },
    ],
    ruled: true,
  }).color(snow));
}

return tree.model();
