meta({
  name: 'paperweight',
  license: 'CC0-1.0',
  title: 'Paperweight',
  description: 'Faceted low-poly desktop paperweight with a contrasting foot and inset top. Knobs: compact or standard format, body, foot and inset colours.',
  tags: ['paperweight', 'desk accessory', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const body = param('body', '#718d95', { label: 'Body' });
const accent = param('accent', '#514f4a', { label: 'Accent' });
const detail = param('detail', '#c2a86e', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('paperweight');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('foot', 0, 0, 0, 78, 70, 12, accent);
addBox('lower-facet', 0, 0, 12, 70, 62, 16, body);
addBox('crown', 0, 0, 28, 48, 42, 18, body);
addBox('top-inset', 0, 0, 46, 18, 16, 4, detail);

return office.model();
