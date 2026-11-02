meta({
  name: "potting-bench",
  license: 'CC0-1.0',
  title: "Potting bench",
  description: "Outdoor potting bench with a deep worktop, lower storage shelf, back rail and hanging hooks. Knobs: worktop width and timber and hardware colours.",
  tags: ["potting bench", "garden workbench", "potting station", "horticulture", "shelf"],
  kit: 'garden',
  category: "furniture",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 400,
});

const width = param('width', '1400', { choices: ['1100', '1400', '1700'], label: 'Worktop width (mm)' });
const timber = param('timber', '#8a6745', { label: 'Timber' });
const metal = param('metal', '#505658', { label: 'Hardware' });
presets({ oak: { timber: '#a67948' }, painted: { timber: '#597254', metal: '#383e40' } });
const W = Number(width.value);
const a = assembly('potting-bench');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-W / 2 + 45, W / 2 - 45]) for (const y of [-260, 260]) addPart('leg', box(70, 70, 880, true).translate(x, y, 440).color(timber));
addPart('worktop', box(W, 620, 75, true).translate(0, 0, 900).color(timber));
addPart('lower-shelf', box(W - 100, 520, 45, true).translate(0, 0, 330).color(timber));
addPart('back-rail', box(W, 55, 280, true).translate(0, 265, 1060).color(timber));
for (let i = 0; i < 4; i++) addPart(`hook-${i}`, box(22, 45, 90, true).translate(-W * 0.32 + i * W * 0.21, 310, 890).color(metal));
addPart('soil-tray', box(360, 210, 45, true).translate(-W * 0.27, -90, 960).color(metal));

return a.model();
