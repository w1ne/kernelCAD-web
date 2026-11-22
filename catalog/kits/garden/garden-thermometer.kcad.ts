meta({
  name: "garden-thermometer",
  license: 'CC0-1.0',
  title: "Garden thermometer",
  description: "Outdoor garden thermometer with a tall scale board, red temperature column and ground stake. Knobs: height and board and scale and indicator colours.",
  tags: ["garden thermometer", "outdoor thermometer", "weather station", "garden"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 260,
});

const height = param('height', '700', { choices: ['550', '700', '850'], label: 'Height (mm)' });
const board = param('board', '#815b39', { label: 'Board' });
const scale = param('scale', '#d8d0bb', { label: 'Scale face' });
const mercury = param('mercury', '#b94e3b', { label: 'Indicator' });
presets({ cedar: { board: '#a87545' }, painted: { board: '#557351', scale: '#f0e9d4' } });
const H = Number(height.value);
const a = assembly('garden-thermometer');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('stake', box(50, 55, H, true).translate(0, 0, H / 2).color(board));
addPart('face', box(230, 45, H * 0.72, true).translate(0, -45, H * 0.68).color(scale));
addPart('scale-column', box(32, 22, H * 0.48, true).translate(0, -75, H * 0.70).color(mercury));
addPart('bulb', sphere(62).scale([1, 1, 1.1]).translate(0, -78, 135).color(mercury));
for (let i = 0; i < 7; i++) addPart('tick', box(i % 2 ? 46 : 76, 18, 15, true).translate(-66, -78, 250 + i * H * 0.07).color(board));
addPart('cap', box(270, 90, 45, true).translate(0, 0, H - 20).color(board));

return a.model();
