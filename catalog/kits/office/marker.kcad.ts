// Office marker: Round office marker with a broad cap, pocket clip and felt tip. Material controls: barrel polymer, marker ink, felt tip.

meta({
  name: 'marker',
  license: 'CC0-1.0',
  title: 'Office marker',
  description: "Round office marker with a broad cap, pocket clip and felt tip. Controls: barrel polymer, marker ink, felt tip.",
  tags: ['marker', 'felt-tip pen', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const polymer = param('polymer', '#5b83a5', { label: 'Barrel polymer' });
const ink = param('ink', '#276395', { label: 'Marker ink' });
const felt = param('felt', '#c3463d', { label: 'Felt tip' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#5b83a5', ink: '#276395', felt: '#c3463d' },
  classroom: { polymer: '#db634a', ink: '#c94e42', felt: '#4c8d63' },
});

const office = assembly('marker');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof ink | typeof felt) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === ink) office.part(name, partShape.color(ink));
  else office.part(name, partShape.color(felt));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof polymer | typeof ink | typeof felt) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === ink) office.part(name, partShape.color(ink));
  else office.part(name, partShape.color(felt));
};

addCylinder('barrel', 118, 8, 0, 0, 0, polymer);
addCylinder('cap', 26, 9, 0, 0, 117, ink);
addCylinder('tip', 11, 5, 0, 0, 0, felt);
addBox('pocket-clip', 8, 5, 87, 4, 4, 34, ink);
addBox('cap-end', 0, 0, 139, 12, 12, 4, felt);

return office.model();
