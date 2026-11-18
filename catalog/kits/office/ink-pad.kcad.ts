// Ink pad: Lidded desktop ink pad with a soft insert and a small colour marker. Material controls: case polymer, ink felt, stamp ink.

meta({
  name: 'ink-pad',
  license: 'CC0-1.0',
  title: 'Ink pad',
  description: "Lidded desktop ink pad with a soft insert and a small colour marker. Controls: case polymer, ink felt, stamp ink.",
  tags: ['ink pad', 'stamp pad', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const polymer = param('polymer', '#475a69', { label: 'Case polymer' });
const felt = param('felt', '#394a55', { label: 'Ink felt' });
const ink = param('ink', '#385f86', { label: 'Stamp ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#475a69', felt: '#394a55', ink: '#385f86' },
  classroom: { polymer: '#d7664a', felt: '#576b9a', ink: '#a44946' },
});

const office = assembly('ink-pad');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof felt | typeof ink) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === felt) office.part(name, partShape.color(felt));
  else office.part(name, partShape.color(ink));
};

addBox('case', 0, 0, 0, 100, 70, 17, polymer);
addBox('ink-surface', 0, 0, 17, 84, 55, 8, felt);
addBox('lid', 0, 0, 25, 108, 76, 7, ink);
addBox('brand-mark', 0, 0, 32, 28, 3, 2, polymer);

return office.model();
