meta({
  name: 'mechanical-pencil',
  license: 'CC0-1.0',
  title: 'Mechanical pencil',
  description: 'Slim mechanical pencil with a stepped grip, clip and exposed writing tip. Knobs: compact or standard format, barrel, grip and clip colours.',
  tags: ['mechanical pencil', 'pencil', 'writing tool', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const body = param('body', '#4c718e', { label: 'Body' });
const accent = param('accent', '#bbc2c5', { label: 'Accent' });
const detail = param('detail', '#42484d', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;
const centerX = 9.5;
const centerY = 1.5;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('mechanical-pencil');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate((x - centerX) * k, (y - centerY) * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('barrel', 0, 0, 0, 145, 8, 8, body);
addBox('grip', -45, 0, 0, 34, 10, 10, detail);
addBox('nose', 76, 0, 2, 18, 6, 4, accent);
addBox('lead', 89, 0, 3, 9, 2, 2, detail);
addBox('button', -70, 0, 0, 9, 9, 8, accent);
addBox('clip', -22, 6, 7, 42, 3, 3, accent);

return office.model();
