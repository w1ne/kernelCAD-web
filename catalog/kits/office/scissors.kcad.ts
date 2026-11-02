meta({
  name: 'scissors',
  license: 'CC0-1.0',
  title: 'Office scissors',
  description: 'Desktop office scissors with crossed blades, pivot and contrasting handles. Knobs: compact or standard format, blade, handle and pivot colours.',
  tags: ['scissors', 'shears', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 280,
});

const body = param('body', '#929da3', { label: 'Body' });
const accent = param('accent', '#c7544d', { label: 'Accent' });
const detail = param('detail', '#43494d', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('scissors');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('blade-left', -23, 0, 0, 94, 8, 3, body);
addBox('blade-right', 23, 0, 3, 94, 8, 3, body);
addBox('handle-left-inner', -70, -14, 0, 44, 7, 8, accent);
addBox('handle-left-outer', -70, 14, 0, 44, 7, 8, accent);
addBox('handle-left-side-a', -91, 0, 0, 7, 34, 8, accent);
addBox('handle-left-side-b', -49, 0, 0, 7, 34, 8, accent);
addBox('handle-right-inner', 70, -14, 0, 44, 7, 8, accent);
addBox('handle-right-outer', 70, 14, 0, 44, 7, 8, accent);
addBox('handle-right-side-a', 49, 0, 0, 7, 34, 8, accent);
addBox('handle-right-side-b', 91, 0, 0, 7, 34, 8, accent);
addCylinder('pivot', 8, 7, 0, 0, 4, detail);

return office.model();
