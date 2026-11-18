meta({
  name: "worm-composter",
  license: 'CC0-1.0',
  title: "Worm composter",
  description: "Stacked worm composting trays with tapered bases, an upper lid and a lower drain tap. Knobs: width and tray and stand and tap colours.",
  tags: ["worm composter", "vermicompost", "composting", "garden waste"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const width = param('width', '520', { choices: ['420', '520', '620'], label: 'Tray width (mm)' });
const tray = param('tray', '#8a6745', { label: 'Trays' });
const stand = param('stand', '#555c54', { label: 'Stand' });
const tap = param('tap', '#b99140', { label: 'Drain tap' });
presets({ cedar: { tray: '#a67749' }, green: { tray: '#536f4b', stand: '#343a35' } });
const W = Number(width.value);
const a = assembly('worm-composter');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-W / 2 + 35, W / 2 - 35]) addPart('leg', box(55, 55, 330, true).translate(x, 0, 165).color(stand));
for (let i = 0; i < 3; i++) {
  const z = 330 + i * 260;
  addPart(`tray-${i}`, box(W - i * 25, W - i * 25, 200, true).translate(0, 0, z).color(tray));
  addPart(`rim-${i}`, box(W + 20, W + 20, 35, true).translate(0, 0, z + 115).color(stand));
}
addPart('lid', box(W + 55, W + 55, 70, true).translate(0, 0, 1120).color(tray));
addPart('drain', cylinder(90, 24).rotateX(90).translate(0, -W / 2 - 20, 390).color(tap));

return a.model();
