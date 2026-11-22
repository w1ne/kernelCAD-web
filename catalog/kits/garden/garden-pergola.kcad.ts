meta({
  name: "garden-pergola",
  license: 'CC0-1.0',
  title: "Garden pergola",
  description: "Open timber pergola with four posts, paired beams and repeated overhead rafters. Knobs: span and timber and post-cap colours.",
  tags: ["pergola", "garden shelter", "timber", "outdoor structure", "backyard"],
  kit: 'garden',
  category: "structure",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 520,
});

const span = param('span', '2200', { choices: ['1800', '2200', '2600'], label: 'Span (mm)' });
const timber = param('timber', '#8a6745', { label: 'Timber' });
const cap = param('cap', '#4c5850', { label: 'Post caps' });
presets({ oak: { timber: '#9a7047' }, painted: { timber: '#4e765e', cap: '#353b3b' } });
const W = Number(span.value);
const a = assembly('garden-pergola');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const x of [-W / 2, W / 2]) for (const y of [-700, 700]) addPart('post', box(100, 100, 2400, true).translate(x, y, 1200).color(timber));
for (const y of [-700, 700]) addPart('side-beam', box(W + 100, 110, 120, true).translate(0, y, 2260).color(timber));
for (let i = 0; i < 7; i++) addPart(`rafter-${i}`, box(100, 1600, 90, true).translate(-W * 0.42 + i * W * 0.14, 0, 2380).color(timber));
for (const x of [-W / 2, W / 2]) for (const y of [-700, 700]) addPart('post-cap', box(120, 120, 24, true).translate(x, y, 2412).color(cap));

return a.model();
