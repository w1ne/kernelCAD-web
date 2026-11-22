meta({
  name: "garden-kneeling-pad",
  license: 'CC0-1.0',
  title: "Garden kneeling pad",
  description: "Thick rectangular garden kneeling pad with a carry handle and two side pockets. Knobs: pad and trim and handle colours.",
  tags: ["kneeling pad", "garden kneeler", "gardening accessory", "backyard"],
  kit: 'garden',
  category: "item",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 220,
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const pad = param('pad', '#536d4c', { label: 'Pad' });
const trim = param('trim', '#b39a69', { label: 'Trim' });
const handle = param('handle', '#4b514b', { label: 'Handle' });
presets({ green: { pad: '#59784f' }, blue: { pad: '#52738a', trim: '#d0c6aa' } });
const a = assembly('garden-kneeling-pad');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape.scale(overallScale));
};

addPart('cushion', box(620, 420, 95, true).translate(0, 0, 47.5).color(pad));
addPart('top-panel', box(530, 325, 18, true).translate(0, 0, 100).color(trim));
addPart('handle', box(190, 45, 30, true).translate(0, 0, 132).color(handle));
for (const x of [-255, 255]) addPart('side-pocket', box(95, 230, 115, true).translate(x, 0, 60).color(trim));
for (const x of [-270, 270]) addPart('corner-pad', box(38, 38, 20, true).translate(x, 170, 103).color(handle));

return a.model();
