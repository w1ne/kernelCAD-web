// Fountain pen: Upright capped fountain pen with a faceted barrel, clip and contrasting nib. Material controls: barrel resin, stainless steel, ink.

meta({
  name: 'fountain-pen',
  license: 'CC0-1.0',
  title: 'Fountain pen',
  description: "Upright capped fountain pen with a faceted barrel, clip and contrasting nib. Controls: barrel resin, stainless steel, ink.",
  tags: ['fountain pen', 'pen', 'writing tool', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const resin = param('resin', '#254f74', { label: 'Barrel resin' });
const stainlessSteel = param('stainlessSteel', '#b7c1c4', { label: 'Stainless steel' });
const ink = param('ink', '#254777', { label: 'Ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { resin: '#254f74', stainlessSteel: '#b7c1c4', ink: '#254777' },
  classroom: { resin: '#9b513f', stainlessSteel: '#d3a84d', ink: '#3d6389' },
});

const office = assembly('fountain-pen');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof resin | typeof stainlessSteel | typeof ink) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === resin) office.part(name, partShape.color(resin));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(ink));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof resin | typeof stainlessSteel | typeof ink) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === resin) office.part(name, partShape.color(resin));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(ink));
};

addCylinder('barrel', 105, 7, 0, 0, 0, resin);
addCylinder('cap', 40, 8, 0, 0, 104, ink);
addCylinder('cap-band', 6, 8, 0, 0, 101, stainlessSteel);
addBox('clip', 7, 0, 122, 4, 4, 26, stainlessSteel);
addBox('nib', 0, 0, 0, 10, 12, 5, stainlessSteel);

return office.model();
