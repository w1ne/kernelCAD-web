// Paper clip dish: Small desk dish with a recessed-looking tray floor and several visible paper clips. Material controls: dish polymer, stainless steel, brass clips.

meta({
  name: 'paper-clip-dish',
  license: 'CC0-1.0',
  title: 'Paper clip dish',
  description: "Small desk dish with a recessed-looking tray floor and several visible paper clips. Controls: dish polymer, stainless steel, brass clips.",
  tags: ['paper clip holder', 'paper clip dish', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const polymer = param('polymer', '#527689', { label: 'Dish polymer' });
const stainlessSteel = param('stainlessSteel', '#b1b8bb', { label: 'Stainless steel' });
const brass = param('brass', '#c79b3e', { label: 'Brass clips' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#527689', stainlessSteel: '#b1b8bb', brass: '#c79b3e' },
  classroom: { polymer: '#d35e4b', stainlessSteel: '#527c8e', brass: '#d7b65a' },
});

const office = assembly('paper-clip-dish');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof stainlessSteel | typeof brass) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(brass));
};

addBox('tray-floor', 0, 0, 0, 92, 92, 8, polymer);
addBox('north-wall', 0, 43, 8, 92, 6, 12, polymer);
addBox('south-wall', 0, -43, 8, 92, 6, 12, polymer);
addBox('east-wall', 43, 0, 8, 6, 92, 12, polymer);
addBox('west-wall', -43, 0, 8, 6, 92, 12, polymer);
addBox('clip-one', -18, 5, 8, 33, 4, 3, stainlessSteel);
addBox('clip-two', 8, -8, 9, 34, 4, 3, stainlessSteel);
addBox('clip-three', 0, 18, 10, 30, 4, 3, brass);

return office.model();
