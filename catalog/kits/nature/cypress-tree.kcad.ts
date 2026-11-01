// Original kernelCAD low-poly Italian cypress: a short trunk under a slender
// flame-shaped column of foliage (one ruled loft of turning polygon rings).

meta({
  name: 'cypress-tree',
  license: 'CC0-1.0',
  title: 'Cypress tree',
  description: 'Slender Mediterranean cypress with a tall flame-shaped column of dark foliage on a short trunk. Knobs: height, width, facets, bark and foliage colours.',
  tags: ['tree', 'cypress', 'italian cypress', 'conifer', 'evergreen', 'mediterranean', 'column', 'garden', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'park', 'meadow', 'desert'],
  triangleBudget: 200,
});

const heightM = param('heightM', '8', { choices: ['5', '8', '12', '16'], label: 'Height (m)' });
const width = param('width', 'slender', { choices: ['slender', 'medium', 'broad'], label: 'Width' });
const sides = param('sides', '7', { choices: ['6', '7', '8'], label: 'Facets' });
const bark = param('bark', '#5b4434', { label: 'Bark' });
const leaves = param('leaves', '#2f5a36', { label: 'Foliage' });

presets({
  bright: { leaves: '#4c7d3a' },
  snowy: { leaves: '#dfe8ea' },
});

const h = Number(heightM.value) * 1000;
const s = Number(sides.value);
const W = h * (width.value === 'slender' ? 0.09 : width.value === 'medium' ? 0.12 : 0.16);

const ngon = (r: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const tree = assembly('cypress-tree');
tree.part('trunk', ngon(h * 0.022).extrude(h * 0.14).color(bark));

// Ring stack [radius, z]; rings turn a little each step so facets spiral.
const rings = [
  [W * 0.55, h * 0.06],
  [W, h * 0.26],
  [W * 0.96, h * 0.5],
  [W * 0.7, h * 0.74],
  [W * 0.32, h * 0.92],
  [W * 0.04, h],
];
const profiles = rings.map(([r], i) => ngon(r, (i * Math.PI) / s));
const column = profiles[0].loft(profiles.slice(1), {
  planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});
tree.part('foliage', column.color(leaves));

return tree.model();
