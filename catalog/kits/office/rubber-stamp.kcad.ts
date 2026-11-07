meta({
  name: 'rubber-stamp',
  license: 'CC0-1.0',
  title: 'Rubber stamp',
  description: 'Hand stamp with a broad rubber base, wooden handle and top cap. Knobs: compact or standard format, handle, rubber and cap colours.',
  tags: ['rubber stamp', 'office supplies', 'stamp', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 160,
});

const body = param('body', '#8b6844', { label: 'Body' });
const accent = param('accent', '#3c4851', { label: 'Accent' });
const detail = param('detail', '#c2a26d', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('rubber-stamp');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('rubber-base', 0, 0, 0, 58, 42, 17, accent);
addBox('wooden-neck', 0, 0, 17, 31, 28, 22, body);
addCylinder('handle', 28, 15, 0, 0, 39, body);
addBox('top-cap', 0, 0, 66, 34, 34, 7, detail);
addBox('marking-face', 0, 0, 0, 44, 27, 3, detail);

return office.model();
