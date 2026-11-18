meta({
  name: "greenhouse-staging-shelf",
  license: 'CC0-1.0',
  title: "Greenhouse staging shelf",
  description: "Tiered greenhouse shelf for seed trays and pots, with a braced timber frame. Knobs: width, shelf levels and timber and tray colours.",
  tags: ["greenhouse shelf", "plant staging", "seed tray rack", "garden shelving"],
  kit: 'garden',
  category: "furniture",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 480,
});

const width = param('width', '1200', { choices: ['900', '1200', '1500'], label: 'Shelf width (mm)' });
const levels = param('levels', '4', { choices: ['3', '4', '5'], label: 'Shelf levels' });
const timber = param('timber', '#76563c', { label: 'Timber' });
const tray = param('tray', '#506c4b', { label: 'Plant trays' });
presets({ natural: { timber: '#9b754d' }, painted: { timber: '#445d4d', tray: '#9b5d42' } });
const W = Number(width.value);
const n = Number(levels.value);
const a = assembly('greenhouse-staging-shelf');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-W / 2 + 35, W / 2 - 35]) for (const y of [-260, 260]) addPart('upright', box(55, 55, 1500, true).translate(x, y, 750).color(timber));
for (let i = 0; i < n; i++) {
  const z = 170 + i * (1180 / (n - 1));
  const w = W - 80;
  addPart(`shelf-${i}`, box(w, 590, 45, true).translate(0, 0, z).color(timber));
  addPart(`tray-${i}`, box(w - 100, 420, 35, true).translate(0, -35, z + 40).color(tray));
}
for (const x of [-W / 2 + 50, W / 2 - 50]) addPart('base-foot', box(120, 620, 35, true).translate(x, 0, 18).color(timber));

return a.model();
