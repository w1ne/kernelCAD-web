// Original kernelCAD low-poly pine tree: a parametric game asset exported with
// `export` glb `style: 'lowpoly'`. Faceted polygon profiles (not smooth
// circles) give the flat-shaded look; colour knobs become palette zones.
// Real-world scale: kernelCAD models in millimetres, the low-poly GLB is metres.

meta({
  name: 'pine-tree',
  title: 'Pine tree',
  description: 'Stacked-cone conifer with a faceted trunk. Knobs: height, tier count, facet count, bark and foliage colours.',
  tags: ['tree', 'conifer', 'pine', 'forest', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest'],
  triangleBudget: 400,
});

const heightM = param('heightM', '4.5', { choices: ['3', '4.5', '6', '8'], label: 'Height (m)' });
const tiers = param('tiers', '3', { choices: ['2', '3', '4', '5'], label: 'Foliage tiers' });
const sides = param('sides', '7', { choices: ['5', '6', '7', '8', '10'], label: 'Facets' });
const bark = param('bark', '#7a4b2a', { label: 'Bark' });
const leaves = param('leaves', '#2f7d4a', { label: 'Foliage' });

presets({
  autumn: { leaves: '#c9772b' },
  snowy: { leaves: '#e8eef2', bark: '#5b4636' },
});

const h = Number(heightM.value) * 1000;
const n = Number(tiers.value);
const s = Number(sides.value);

// Regular polygon profile: the facet count is the low-poly look.
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) {
    p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  }
  return p.close();
};

const tree = assembly('pine-tree');
tree.part('trunk', ngon(h * 0.04).extrude(h * 0.3).color(bark));
const tierH = (h * 0.8) / n;
for (let i = 0; i < n; i++) {
  const z0 = h * 0.2 + i * ((h * 0.8 - tierH) / (n - 1));
  const r = h * 0.22 * (1 - i / (n + 1));
  const cone = ngon(r).loft(ngon(r * 0.04), { spacing: tierH, ruled: true }).translate(0, 0, z0);
  tree.part(`foliage-${i + 1}`, cone.color(leaves));
}

return tree.model();
