meta({
  name: "seedling-tray",
  license: 'CC0-1.0',
  title: "Seedling tray",
  description: "Rectangular nursery tray with a regular grid of small planting cells and a carrying rim. Knobs: cell count and tray and cell colours.",
  tags: ["seedling tray", "nursery tray", "plant propagation", "garden"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 300,
});

const cells = param('cells', '12', { choices: ['8', '12', '16'], label: 'Cell count' });
const tray = param('tray', '#536d4c', { label: 'Tray' });
const cell = param('cell', '#3f3328', { label: 'Growing medium' });
presets({ green: { tray: '#4d7549' }, black: { tray: '#343a39', cell: '#302a24' } });
const N = Number(cells.value);
const cols = N === 8 ? 4 : N === 12 ? 4 : 4;
const rows = N / cols;
const a = assembly('seedling-tray');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('base', box(720, 520, 35, true).translate(0, 0, 17.5).color(tray));
for (let i = 0; i <= cols; i++) addPart('cell-wall', box(22, 520, 145, true).translate(-360 + i * 720 / cols, 0, 105).color(tray));
for (let i = 0; i <= rows; i++) addPart('cell-wall', box(720, 22, 145, true).translate(0, -260 + i * 520 / rows, 105).color(tray));
for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) addPart(`soil-cell-${x}-${y}`, box(140, 110, 75, true).translate(-270 + x * 180, -170 + y * 170, 65).color(cell));
for (const y of [-260, 260]) addPart('rim', box(760, 25, 55, true).translate(0, y, 150).color(tray));

return a.model();
