// Office ruler: Flat office ruler with alternating length marks and a contrasting zero end. Material controls: ruler acrylic, scale ink, end aluminum.

meta({
  name: 'ruler',
  license: 'CC0-1.0',
  title: 'Office ruler',
  description: "Flat office ruler with alternating length marks and a contrasting zero end. Controls: ruler acrylic, scale ink, end aluminum.",
  tags: ['ruler', 'measuring tool', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 220,
});

const acrylic = param('acrylic', '#d4ccad', { label: 'Ruler acrylic' });
const ink = param('ink', '#3d586b', { label: 'Scale ink' });
const aluminum = param('aluminum', '#b7bec0', { label: 'End aluminum' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { acrylic: '#d4ccad', ink: '#3d586b', aluminum: '#b7bec0' },
  classroom: { acrylic: '#6e9a79', ink: '#c45043', aluminum: '#d2a649' },
});

const office = assembly('ruler');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof acrylic | typeof ink | typeof aluminum) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === acrylic) office.part(name, partShape.color(acrylic));
  else if (colour === ink) office.part(name, partShape.color(ink));
  else office.part(name, partShape.color(aluminum));
};

addBox('ruler-acrylic', 0, 0, 0, 250, 35, 5, acrylic);
addBox('zero-end', -116, 0, 5, 18, 35, 3, aluminum);
for (let i = 0; i < 10; i++) {
  const x = -96 + i * 21;
  const h = i % 2 === 0 ? 15 : 9;
  addBox(`tick-${i + 1}`, x, 9, 5, 2, h, 2, ink);
}
addBox('scale-line', 0, -12, 5, 208, 2, 2, ink);

return office.model();
