// Desktop calculator: Desktop calculator with segmented display, solar strip and a four-by-three keypad. Material controls: case polymer, lcd glass, keycap plastic.

meta({
  name: 'calculator',
  license: 'CC0-1.0',
  title: 'Desktop calculator',
  description: "Desktop calculator with segmented display, solar strip and a four-by-three keypad. Controls: case polymer, lcd glass, keycap plastic.",
  tags: ['calculator', 'desktop calculator', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 250,
});

const polymer = param('polymer', '#3c454b', { label: 'Case polymer' });
const lcdGlass = param('lcdGlass', '#7d9e80', { label: 'LCD glass' });
const keycapPlastic = param('keycapPlastic', '#cdd0c6', { label: 'Keycap plastic' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#3c454b', lcdGlass: '#7d9e80', keycapPlastic: '#cdd0c6' },
  classroom: { polymer: '#e17448', lcdGlass: '#8ba8d0', keycapPlastic: '#f0cf56' },
});

const office = assembly('calculator');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof lcdGlass | typeof keycapPlastic) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === lcdGlass) office.part(name, partShape.color(lcdGlass));
  else office.part(name, partShape.color(keycapPlastic));
};

addBox('case', 0, 0, 0, 115, 180, 15, polymer);
addBox('display', 0, 57, 15, 82, 28, 4, lcdGlass);
addBox('solar-panel', 0, 28, 15, 56, 10, 3, keycapPlastic);
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    addBox(`key-${row}-${col}`, -33 + col * 33, 2 - row * 28, 15, 23, 20, 5, row === 0 ? keycapPlastic : lcdGlass);
  }
}
addBox('zero-key', 0, -76, 15, 55, 20, 5, keycapPlastic);

return office.model();
