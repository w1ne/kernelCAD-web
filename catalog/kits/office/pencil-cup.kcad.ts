meta({
  name: 'pencil-cup',
  license: 'CC0-1.0',
  title: 'Pencil cup',
  description: 'Open desktop cup with a stable base and a small set of upright writing tools. Knobs: compact or standard format, cup, tools and trim colours.',
  tags: ['pencil cup', 'pen holder', 'desk organizer', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#597a86', { label: 'Body' });
const accent = param('accent', '#d9bc70', { label: 'Accent' });
const detail = param('detail', '#554c43', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('pencil-cup');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('cup-floor', 0, 0, 0, 72, 72, 8, detail);
addBox('front-wall', 0, -33, 8, 72, 6, 74, body);
addBox('back-wall', 0, 33, 8, 72, 6, 74, body);
addBox('left-wall', -33, 0, 8, 6, 72, 74, body);
addBox('right-wall', 33, 0, 8, 6, 72, 74, body);
addBox('pencil-one', -18, 2, 14, 8, 8, 110, accent);
addBox('pencil-two', 3, -5, 14, 8, 8, 122, detail);
addBox('pencil-three', 20, 7, 14, 8, 8, 98, accent);
addBox('rim-front', 0, -33, 78, 72, 6, 5, detail);
addBox('rim-back', 0, 33, 78, 72, 6, 5, detail);
addBox('rim-left', -33, 0, 78, 6, 72, 5, detail);
addBox('rim-right', 33, 0, 78, 6, 72, 5, detail);

return office.model();
