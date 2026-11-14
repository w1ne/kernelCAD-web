// Mechanical pencil: Slim mechanical pencil with a stepped grip, clip and exposed writing tip. Material controls: barrel aluminum, grip polymer, graphite lead.

meta({
  name: 'mechanical-pencil',
  license: 'CC0-1.0',
  title: 'Mechanical pencil',
  description: "Slim mechanical pencil with a stepped grip, clip and exposed writing tip. Controls: barrel aluminum, grip polymer, graphite lead.",
  tags: ['mechanical pencil', 'pencil', 'writing tool', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const aluminum = param('aluminum', '#9aa6aa', { label: 'Barrel aluminum' });
const polymer = param('polymer', '#d85e4d', { label: 'Grip polymer' });
const graphite = param('graphite', '#393c3e', { label: 'Graphite lead' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;
const centerX = 9.5;
const centerY = 1.5;

presets({
  professional: { aluminum: '#9aa6aa', polymer: '#d85e4d', graphite: '#393c3e' },
  classroom: { aluminum: '#4a7892', polymer: '#607e54', graphite: '#d4ae4c' },
});

const office = assembly('mechanical-pencil');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof aluminum | typeof polymer | typeof graphite) => {
  const partShape = box(w * k, d * k, h * k, true).translate((x - centerX) * k, (y - centerY) * k, (z + h / 2) * k);
  if (colour === aluminum) office.part(name, partShape.color(aluminum));
  else if (colour === polymer) office.part(name, partShape.color(polymer));
  else office.part(name, partShape.color(graphite));
};

addBox('barrel', 0, 0, 0, 145, 8, 8, aluminum);
addBox('grip', -45, 0, 0, 34, 10, 10, graphite);
addBox('nose', 76, 0, 2, 18, 6, 4, polymer);
addBox('lead', 89, 0, 3, 9, 2, 2, graphite);
addBox('button', -70, 0, 0, 9, 9, 8, polymer);
addBox('clip', -22, 6, 7, 42, 3, 3, polymer);

return office.model();
