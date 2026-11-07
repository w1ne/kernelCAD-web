// Letter tray: Stackable letter tray with one to three shallow document shelves. Material controls: tray polymer, grip rubber, stainless steel.

meta({
  name: 'letter-tray',
  license: 'CC0-1.0',
  title: 'Letter tray',
  description: "Stackable letter tray with one to three shallow document shelves. Controls: tray polymer, grip rubber, stainless steel.",
  tags: ['letter tray', 'document tray', 'paper tray', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 280,
});

const polymer = param('polymer', '#405969', { label: 'Tray polymer' });
const rubber = param('rubber', '#303c44', { label: 'Grip rubber' });
const stainlessSteel = param('stainlessSteel', '#b5b8b6', { label: 'Stainless steel' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#405969', rubber: '#303c44', stainlessSteel: '#b5b8b6' },
  classroom: { polymer: '#d6674a', rubber: '#78904f', stainlessSteel: '#d0a448' },
});

const tiers = param('tiers', '2', { choices: ['1', '2', '3'], label: 'Shelf count' });
const tierCount = Number(tiers.value);

const office = assembly('letter-tray');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof rubber | typeof stainlessSteel) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === rubber) office.part(name, partShape.color(rubber));
  else office.part(name, partShape.color(stainlessSteel));
};

for (let i = 0; i < tierCount; i++) {
  const z = i * 28;
  addBox(`shelf-${i + 1}`, 0, 0, z, 210, 285, 8, polymer);
  addBox(`left-rail-${i + 1}`, -99, 0, z + 8, 12, 285, 20, rubber);
  addBox(`right-rail-${i + 1}`, 99, 0, z + 8, 12, 285, 20, rubber);
  addBox(`back-stop-${i + 1}`, 0, 135, z + 8, 190, 12, 20, rubber);
}
addBox('front-label', 0, -142, 12, 42, 5, 13, stainlessSteel);

return office.model();
