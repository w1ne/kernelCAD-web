meta({
  name: 'hole-punch',
  license: 'CC0-1.0',
  title: 'Hole punch',
  description: 'Two-hole desktop punch with a broad lever, paper entry and pair of punch buttons. Knobs: compact or standard format, body, lever and metal colours.',
  tags: ['hole punch', 'paper punch', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 170,
});

const body = param('body', '#4e6477', { label: 'Body' });
const accent = param('accent', '#b9bec1', { label: 'Accent' });
const detail = param('detail', '#353c40', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('hole-punch');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('base', 0, 0, 0, 132, 88, 14, body);
addBox('lever', 0, 6, 32, 130, 42, 14, accent);
addBox('lever-grip', 0, -2, 41, 74, 27, 5, body);
addCylinder('left-button', 8, 8, -37, 4, 46, detail);
addCylinder('right-button', 8, 8, 37, 4, 46, detail);
addBox('paper-slot', 0, -39, 15, 70, 4, 8, detail);

return office.model();
