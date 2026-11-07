// Hole punch: Two-hole desktop punch with a broad lever, paper entry and pair of punch buttons. Material controls: powder-coated steel, stainless steel, handle polymer.

meta({
  name: 'hole-punch',
  license: 'CC0-1.0',
  title: 'Hole punch',
  description: "Two-hole desktop punch with a broad lever, paper entry and pair of punch buttons. Controls: powder-coated steel, stainless steel, handle polymer.",
  tags: ['hole punch', 'paper punch', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 170,
});

const powderCoatedSteel = param('powderCoatedSteel', '#425e76', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#b6bdc0', { label: 'Stainless steel' });
const polymer = param('polymer', '#d05b47', { label: 'Handle polymer' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { powderCoatedSteel: '#425e76', stainlessSteel: '#b6bdc0', polymer: '#d05b47' },
  classroom: { powderCoatedSteel: '#df664b', stainlessSteel: '#d5a94b', polymer: '#527f91' },
});

const office = assembly('hole-punch');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof powderCoatedSteel | typeof stainlessSteel | typeof polymer) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === powderCoatedSteel) office.part(name, partShape.color(powderCoatedSteel));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(polymer));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof powderCoatedSteel | typeof stainlessSteel | typeof polymer) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === powderCoatedSteel) office.part(name, partShape.color(powderCoatedSteel));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(polymer));
};

addBox('base', 0, 0, 0, 132, 88, 14, powderCoatedSteel);
addBox('lever', 0, 6, 32, 130, 42, 14, stainlessSteel);
addBox('lever-grip', 0, -2, 41, 74, 27, 5, powderCoatedSteel);
addCylinder('left-button', 8, 8, -37, 4, 46, polymer);
addCylinder('right-button', 8, 8, 37, 4, 46, polymer);
addBox('paper-slot', 0, -39, 15, 70, 4, 8, polymer);

return office.model();
