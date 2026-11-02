meta({
  name: 'marker',
  license: 'CC0-1.0',
  title: 'Office marker',
  description: 'Round office marker with a broad cap, pocket clip and felt tip. Knobs: compact or standard format, barrel, cap and tip colours.',
  tags: ['marker', 'felt-tip pen', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#53677d', { label: 'Body' });
const accent = param('accent', '#c74e42', { label: 'Accent' });
const detail = param('detail', '#e9e3d7', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('marker');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addCylinder('barrel', 118, 8, 0, 0, 0, body);
addCylinder('cap', 26, 9, 0, 0, 117, accent);
addCylinder('tip', 11, 5, 0, 0, 0, detail);
addBox('pocket-clip', 8, 5, 87, 4, 4, 34, accent);
addBox('cap-end', 0, 0, 139, 12, 12, 4, detail);

return office.model();
