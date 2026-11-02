meta({
  name: 'stapler',
  license: 'CC0-1.0',
  title: 'Stapler',
  description: 'Desktop stapler with a long base, hinged upper arm and rear hinge pin. Knobs: compact or standard format, body, top and hinge colours.',
  tags: ['stapler', 'staple gun', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 130,
});

const body = param('body', '#56636b', { label: 'Body' });
const accent = param('accent', '#c7c9c8', { label: 'Accent' });
const detail = param('detail', '#33393d', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('stapler');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('base', 0, 0, 0, 145, 48, 12, body);
addBox('upper-arm', 0, 9, 22, 142, 34, 16, accent);
addBox('nose', 66, -4, 12, 18, 39, 10, detail);
addCylinder('hinge', 8, 6, -61, 8, 16, detail);
addBox('grip-pad', -4, 9, 38, 88, 27, 3, body);

return office.model();
