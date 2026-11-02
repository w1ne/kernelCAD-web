meta({
  name: "garden-arbor",
  license: 'CC0-1.0',
  title: "Garden arbor",
  description: "Freestanding timber garden arbor with cross rails and roof slats. Knobs: span and timber and hardware colours.",
  tags: ["arbor", "garden arch", "pergola", "timber", "backyard"],
  kit: 'garden',
  category: "structure",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 420,
});

const span = param('span', '1500', { choices: ['1200', '1500', '1800'], label: 'Arch span (mm)' });
const timber = param('timber', '#815b39', { label: 'Timber' });
const hardware = param('hardware', '#4d5455', { label: 'Hardware' });
presets({ cedar: { timber: '#b27a47' }, painted: { timber: '#557b59', hardware: '#31383a' } });
const W = Number(span.value);
const a = assembly('garden-arbor');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-W / 2, W / 2]) addPart('post', box(90, 90, 2100, true).translate(x, 0, 1050).color(timber));
addPart('header', box(W + 90, 100, 110, true).translate(0, 0, 2050).color(timber));
addPart('rear-rail', box(W + 90, 80, 70, true).translate(0, 180, 1930).color(timber));
for (let i = 0; i < 5; i++) addPart(`roof-slat-${i}`, box(90, 560, 55, true).translate(-W * 0.42 + i * W * 0.21, 0, 2130).color(timber));
for (const x of [-W / 2 + 80, W / 2 - 80]) addPart('foot-plate', box(120, 120, 18, true).translate(x, 0, 9).color(hardware));

return a.model();
