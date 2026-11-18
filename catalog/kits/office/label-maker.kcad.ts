// Desktop label maker: Small desktop label maker with display, keypad, feed opening and tape cartridge. Material controls: case polymer, lcd glass, grip rubber.

meta({
  name: 'label-maker',
  license: 'CC0-1.0',
  title: 'Desktop label maker',
  description: "Small desktop label maker with display, keypad, feed opening and tape cartridge. Controls: case polymer, lcd glass, grip rubber.",
  tags: ['label maker', 'label printer', 'office equipment', 'office', 'stationery'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 240,
});

const polymer = param('polymer', '#d86045', { label: 'Case polymer' });
const lcdGlass = param('lcdGlass', '#88a899', { label: 'LCD glass' });
const rubber = param('rubber', '#363c40', { label: 'Grip rubber' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#d86045', lcdGlass: '#88a899', rubber: '#363c40' },
  classroom: { polymer: '#4b718d', lcdGlass: '#b7cbe0', rubber: '#e1bd50' },
});

const office = assembly('label-maker');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof lcdGlass | typeof rubber) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === lcdGlass) office.part(name, partShape.color(lcdGlass));
  else office.part(name, partShape.color(rubber));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof polymer | typeof lcdGlass | typeof rubber) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === lcdGlass) office.part(name, partShape.color(lcdGlass));
  else office.part(name, partShape.color(rubber));
};

addBox('case', 0, 0, 0, 165, 110, 32, polymer);
addBox('display', -38, 22, 32, 58, 24, 4, lcdGlass);
addBox('tape-exit', 24, -53, 0, 78, 5, 10, rubber);
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 4; col++) {
    addBox(`key-${row}-${col}`, -47 + col * 31, -8 + row * 24, 32, 20, 16, 4, lcdGlass);
  }
}
addCylinder('tape-roll', 10, 18, 61, 26, 0, rubber);
addBox('feed-guide', 20, -49, 10, 84, 4, 3, lcdGlass);

return office.model();
