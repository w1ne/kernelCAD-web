meta({
  name: "garden-orb-sculpture",
  license: 'CC0-1.0',
  title: "Garden orb sculpture",
  description: "Polished garden sphere on a short tiered stone pedestal for a border or patio. Knobs: orb and pedestal and plinth colours.",
  tags: ["garden orb", "sphere sculpture", "garden ornament", "patio decor"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 240,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const orb = param('orb', '#5c8892', { label: 'Orb' });
const pedestal = param('pedestal', '#9c9584', { label: 'Pedestal' });
const plinth = param('plinth', '#6c726d', { label: 'Plinth' });
presets({ blueStone: { orb: '#5f8797', pedestal: '#b3aa96' }, bronze: { orb: '#987449' } });
const a = assembly('garden-orb-sculpture');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

addPart('plinth', box(520, 520, 110, true).translate(0, 0, 55).color(plinth));
addPart('base', cylinder(90, 220).translate(0, 0, 110).color(pedestal));
addPart('pedestal', cylinder(300, 120).translate(0, 0, 200).color(pedestal));
addPart('capital', cylinder(80, 205).translate(0, 0, 500).color(pedestal));
addPart('orb', sphere(245).translate(0, 0, 785).color(orb));

return a.model();
