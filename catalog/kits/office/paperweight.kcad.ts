// Paperweight: Faceted low-poly desktop paperweight with a contrasting foot and inset top. Material controls: glass body, brass foot, ceramic inset.

meta({
  name: 'paperweight',
  license: 'CC0-1.0',
  title: 'Paperweight',
  description: "Faceted low-poly desktop paperweight with a contrasting foot and inset top. Controls: glass body, brass foot, ceramic inset.",
  tags: ['paperweight', 'desk accessory', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const glass = param('glass', '#5d8791', { label: 'Glass body' });
const brass = param('brass', '#c29e54', { label: 'Brass foot' });
const ceramic = param('ceramic', '#454d53', { label: 'Ceramic inset' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { glass: '#5d8791', brass: '#c29e54', ceramic: '#454d53' },
  classroom: { glass: '#d16a52', brass: '#d1ac4b', ceramic: '#547d90' },
});

const office = assembly('paperweight');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof glass | typeof brass | typeof ceramic) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === glass) office.part(name, partShape.color(glass));
  else if (colour === brass) office.part(name, partShape.color(brass));
  else office.part(name, partShape.color(ceramic));
};

addBox('foot', 0, 0, 0, 78, 70, 12, brass);
addBox('lower-facet', 0, 0, 12, 70, 62, 16, glass);
addBox('crown', 0, 0, 28, 48, 42, 18, glass);
addBox('top-inset', 0, 0, 46, 18, 16, 4, ceramic);

return office.model();
