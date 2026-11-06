// Tape dispenser: Weighted desktop tape dispenser with a visible roll, spindle and serrated cutting edge. Material controls: dispenser polymer, cutter stainless steel, roller rubber.

meta({
  name: 'tape-dispenser',
  license: 'CC0-1.0',
  title: 'Tape dispenser',
  description: "Weighted desktop tape dispenser with a visible roll, spindle and serrated cutting edge. Controls: dispenser polymer, cutter stainless steel, roller rubber.",
  tags: ['tape dispenser', 'office supplies', 'adhesive tape', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 220,
});

const polymer = param('polymer', '#496b80', { label: 'Dispenser polymer' });
const stainlessSteel = param('stainlessSteel', '#acb4b8', { label: 'Cutter stainless steel' });
const rubber = param('rubber', '#343a3c', { label: 'Roller rubber' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#496b80', stainlessSteel: '#acb4b8', rubber: '#343a3c' },
  classroom: { polymer: '#d36249', stainlessSteel: '#d2a94c', rubber: '#688751' },
});

const office = assembly('tape-dispenser');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof stainlessSteel | typeof rubber) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(rubber));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof polymer | typeof stainlessSteel | typeof rubber) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(rubber));
};

addBox('weighted-base', 0, 0, 0, 130, 56, 18, polymer);
addCylinder('tape-roll', 18, 30, -5, 0, 18, rubber);
addCylinder('hub', 21, 8, -5, 0, 16, stainlessSteel);
addBox('cutting-arm', 43, -10, 16, 46, 12, 26, polymer);
addBox('serrated-edge', 43, -17, 40, 46, 5, 4, stainlessSteel);

return office.model();
