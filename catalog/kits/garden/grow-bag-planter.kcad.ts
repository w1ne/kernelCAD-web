meta({
  name: "grow-bag-planter",
  license: 'CC0-1.0',
  title: "Grow bag planter",
  description: "Flexible cylindrical fabric grow bag with a rolled rim, reinforced handles and dark soil surface. Knobs: bag diameter and fabric and soil colours.",
  tags: ["grow bag", "fabric planter", "container gardening", "garden"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 240,
});

const diameter = param('diameter', '460', { choices: ['360', '460', '560'], label: 'Diameter (mm)' });
const fabric = param('fabric', '#68734d', { label: 'Fabric' });
const soil = param('soil', '#4c3b2d', { label: 'Soil' });
const handle = param('handle', '#8d7957', { label: 'Handles' });
presets({ olive: { fabric: '#5d7049' }, charcoal: { fabric: '#424849', handle: '#6c7673' } });
const D = Number(diameter.value);
const a = assembly('grow-bag-planter');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('bag-body', cylinder(420, D / 2).color(fabric));
addPart('rolled-rim', cylinder(55, D / 2 + 24).translate(0, 0, 390).color(handle));
addPart('soil', cylinder(35, D * 0.40).translate(0, 0, 420).color(soil));
for (const x of [-D * 0.34, D * 0.34]) addPart('handle-loop', box(115, 55, 180, true).translate(x, 0, 405).color(handle));

return a.model();
