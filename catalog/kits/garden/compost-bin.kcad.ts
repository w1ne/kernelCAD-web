// Ventilated timber compost bin: the rear and two sides retain loose boards,
// while front boards lift out to expose the compost at the base. A rounded pile
// is visible through the configurable lower opening. Millimetres, Z up; the
// default footprint is 1000 mm square and the corner posts are 1000 mm tall.
meta({
  name: "compost-bin",
  license: 'CC0-1.0',
  title: "Slatted compost bin",
  description: "Ventilated timber garden compost bin with corner posts, side and rear slats, a rounded visible compost pile, and a configurable removable-slat front (open, lower access, or closed). Choose 800, 1000, or 1200 mm width. Material controls: treated timber and compost. Includes recycled, painted and mature presets.",
  tags: ["compost bin", "composter", "garden waste", "allotment"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 420,
});

const width = param('width', '1000', { choices: ['800', '1000', '1200'], label: 'Bin width (mm)' });
const frontAccess = param('frontAccess', 'open', { choices: ['open', 'lower-access', 'closed'], label: 'Front access' });
const timber = param('timber', '#98704c', { label: 'Treated timber' });
const compost = param('compost', '#493126', { label: 'Compost' });
presets({
  recycled: { timber: '#887456', compost: '#493126' },
  painted: { timber: '#536748', compost: '#493126' },
  mature: { timber: '#71634e', compost: '#38291f' },
});
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
  addPart('rear-slat', box(W, 45, 80, true).translate(0, W / 2, z).color(timber));
  for (const x of [-W / 2, W / 2]) addPart('end-slat', box(45, W, 80, true).translate(x, 0, z).color(timber));
  if (frontAccess.value === 'closed' || (frontAccess.value === 'lower-access' && i >= 3)) {
    addPart('removable-front-slat', box(W, 45, 80, true).translate(0, -W / 2, z).color(timber));
  }
}
addPart('compost-mound', sphere((W - 150) / 2).scale([1, 0.92, 0.6]).translate(0, 20, 260).color(compost));

return a.model();
