meta({
  name: "cold-frame",
  license: 'CC0-1.0',
  title: "Cold frame",
  description: "Low timber cold frame with a raised planting box and sloped glazed lid. Knobs: width and timber and soil and lid colours.",
  tags: ["cold frame", "seedling", "garden", "propagation", "planter"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 320,
});

const width = param('width', '1000', { choices: ['800', '1000', '1200'], label: 'Width (mm)' });
const timber = param('timber', '#815b39', { label: 'Timber frame' });
const lid = param('lid', '#a8cbbb', { label: 'Glazed lid' });
const soil = param('soil', '#574838', { label: 'Soil' });
presets({ cedar: { timber: '#b07b49' }, green: { timber: '#58764c', lid: '#9cc6ad', soil: '#40352b' } });
const W = Number(width.value);
const a = assembly('cold-frame');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('base', box(W, 620, 45, true).translate(0, 0, 22.5).color(timber));
for (const y of [-285, 285]) addPart('long-wall', box(W, 50, 330, true).translate(0, y, 205).color(timber));
for (const x of [-W / 2 + 25, W / 2 - 25]) addPart('end-wall', box(50, 520, 330, true).translate(x, 0, 205).color(timber));
addPart('soil-bed', box(W - 100, 500, 65, true).translate(0, 0, 130).color(soil));
addPart('glazed-lid', box(W + 80, 700, 35, true).rotateY(-14).translate(0, 0, 440).color(lid));
for (const x of [-W / 2 + 30, W / 2 - 30]) addPart('lid-hinge', box(55, 80, 25, true).translate(x, -260, 390).color(timber));

return a.model();
