meta({
  name: 'fountain-pen',
  license: 'CC0-1.0',
  title: 'Fountain pen',
  description: 'Upright capped fountain pen with a faceted barrel, clip and contrasting nib. Knobs: compact or standard format, barrel, cap and hardware colours.',
  tags: ['fountain pen', 'pen', 'writing tool', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#2f5874', { label: 'Body' });
const accent = param('accent', '#b79b5c', { label: 'Accent' });
const detail = param('detail', '#d1d3d1', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('fountain-pen');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addCylinder('barrel', 105, 7, 0, 0, 0, body);
addCylinder('cap', 40, 8, 0, 0, 104, detail);
addCylinder('cap-band', 6, 8, 0, 0, 101, accent);
addBox('clip', 7, 0, 122, 4, 4, 26, accent);
addBox('nib', 0, 0, 0, 10, 12, 5, accent);

return office.model();
