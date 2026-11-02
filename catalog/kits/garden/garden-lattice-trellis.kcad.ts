meta({
  name: "garden-lattice-trellis",
  license: 'CC0-1.0',
  title: "Garden lattice trellis",
  description: "Freestanding square-lattice trellis panel between two posts for climbing garden plants. Knobs: width and timber and hardware colours.",
  tags: ["lattice trellis", "climbing plants", "garden screen", "panel"],
  kit: 'garden',
  category: "structure",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 440,
});

const width = param('width', '1200', { choices: ['900', '1200', '1500'], label: 'Panel width (mm)' });
const timber = param('timber', '#815b39', { label: 'Timber' });
const hardware = param('hardware', '#4c5454', { label: 'Hardware' });
presets({ cedar: { timber: '#ad7947' }, painted: { timber: '#557b59', hardware: '#30383a' } });
const W = Number(width.value);
const a = assembly('garden-lattice-trellis');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-W / 2, W / 2]) addPart('post', box(70, 70, 1900, true).translate(x, 0, 950).color(timber));
for (let i = 0; i < 6; i++) addPart(`horizontal-${i}`, box(W, 35, 35, true).translate(0, 0, 250 + i * 280).color(timber));
for (let i = 0; i < 5; i++) addPart(`vertical-${i}`, box(35, 35, 1550, true).translate(-W * 0.4 + i * W * 0.2, 0, 1020).color(timber));
for (const x of [-W / 2, W / 2]) addPart('ground-spike', box(35, 35, 300, true).translate(x, 0, 150).color(hardware));

return a.model();
