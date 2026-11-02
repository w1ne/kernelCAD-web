meta({
  name: "compost-bin",
  license: 'CC0-1.0',
  title: "Slatted compost bin",
  description: "Open-front slatted garden compost bin with corner posts and removable front boards. Knobs: width and timber and compost colours.",
  tags: ["compost bin", "composter", "garden waste", "allotment"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 420,
});

const width = param('width', '1000', { choices: ['800', '1000', '1200'], label: 'Bin width (mm)' });
const timber = param('timber', '#76563c', { label: 'Timber' });
const compost = param('compost', '#49372a', { label: 'Compost' });
presets({ recycled: { timber: '#887456', compost: '#3d3025' }, painted: { timber: '#536748' } });
const W = Number(width.value);
const a = assembly('compost-bin');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-W / 2, W / 2]) for (const y of [-W / 2, W / 2]) addPart('corner-post', box(70, 70, 1000, true).translate(x, y, 500).color(timber));
for (let i = 0; i < 6; i++) {
  const z = 120 + i * 155;
  for (const y of [-W / 2, W / 2]) addPart('side-slat', box(W, 45, 80, true).translate(0, y, z).color(timber));
  for (const x of [-W / 2, W / 2]) addPart('back-slat', box(45, W, 80, true).translate(x, 0, z).color(timber));
}
addPart('compost-fill', box(W - 150, W - 150, 420, true).translate(0, 0, 240).color(compost));

return a.model();
