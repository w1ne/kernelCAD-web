meta({
  name: "row-cover-tunnel",
  license: 'CC0-1.0',
  title: "Row cover tunnel",
  description: "Low poly tunnel frame for protecting a vegetable row, with end hoops and a light cover. Knobs: length and frame and cover colours.",
  tags: ["row cover", "crop tunnel", "vegetable garden", "plant protection"],
  kit: 'garden',
  category: "structure",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 380,
});

const length = param('length', '1800', { choices: ['1200', '1800', '2400'], label: 'Length (mm)' });
const frame = param('frame', '#667064', { label: 'Frame' });
const cover = param('cover', '#c8d8c8', { label: 'Cover' });
presets({ white: { cover: '#e2e7dc' }, frost: { cover: '#a7c8d6', frame: '#777f7c' } });
const L = Number(length.value);
const a = assembly('row-cover-tunnel');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

for (const y of [-550, 550]) addPart('ground-runner', box(L, 40, 35, true).translate(0, y, 17.5).color(frame));
for (let i = 0; i < 4; i++) {
  const x = -L * 0.42 + i * L * 0.28;
  for (const y of [-500, 500]) addPart('hoop-leg', box(35, 35, 800, true).rotateX(y < 0 ? -28 : 28).translate(x, y * 0.52, 400).color(frame));
  addPart('ridge-crossbar', box(35, 950, 35, true).translate(x, 0, 790).color(frame));
}
addPart('roof-cover', box(L, 1180, 25, true).translate(0, 0, 825).color(cover));
for (const x of [-L / 2, L / 2]) addPart('end-cover', box(30, 1000, 720, true).translate(x, 0, 400).color(cover));

return a.model();
