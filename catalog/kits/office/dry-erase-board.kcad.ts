// Dry-erase board: Standing dry-erase board with an aluminium frame, marker tray and three-point support. Material controls: enamel steel, aluminum frame, marker polymer.

meta({
  name: 'dry-erase-board',
  license: 'CC0-1.0',
  title: 'Dry-erase board',
  description: "Standing dry-erase board with an aluminium frame, marker tray and three-point support. Controls: enamel steel, aluminum frame, marker polymer.",
  tags: ['dry erase board', 'whiteboard', 'office board', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 200,
});

const enamelSteel = param('enamelSteel', '#f3f3eb', { label: 'Enamel steel' });
const aluminum = param('aluminum', '#9da8ab', { label: 'Aluminum frame' });
const polymer = param('polymer', '#497083', { label: 'Marker polymer' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { enamelSteel: '#f3f3eb', aluminum: '#9da8ab', polymer: '#497083' },
  classroom: { enamelSteel: '#f2e88a', aluminum: '#456d88', polymer: '#d7584a' },
});

const office = assembly('dry-erase-board');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof enamelSteel | typeof aluminum | typeof polymer) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === enamelSteel) office.part(name, partShape.color(enamelSteel));
  else if (colour === aluminum) office.part(name, partShape.color(aluminum));
  else office.part(name, partShape.color(polymer));
};

addBox('writing-surface', 0, 0, 315, 440, 18, 560, enamelSteel);
addBox('top-frame', 0, 0, 875, 462, 10, 14, aluminum);
addBox('bottom-frame', 0, 0, 301, 462, 10, 14, aluminum);
addBox('left-frame', -225, 0, 315, 10, 18, 560, aluminum);
addBox('right-frame', 225, 0, 315, 10, 18, 560, aluminum);
addBox('marker-tray', 0, -32, 300, 360, 52, 16, aluminum);
addBox('marker', 0, -34, 316, 104, 10, 8, polymer);
addBox('left-leg', -140, 48, 0, 18, 20, 315, aluminum);
addBox('right-leg', 140, 48, 0, 18, 20, 315, aluminum);
addBox('leg-crossbar', 0, 48, 260, 278, 20, 20, aluminum);
addBox('left-foot', -140, 48, 0, 220, 24, 18, aluminum);
addBox('right-foot', 140, 48, 0, 220, 24, 18, aluminum);

return office.model();
