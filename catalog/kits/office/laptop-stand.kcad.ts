meta({
  name: 'laptop-stand',
  license: 'CC0-1.0',
  title: 'Laptop stand',
  description: 'Desktop laptop riser with two support rails, raised front lips and a stable rear foot. Knobs: compact or standard format, frame, pads and trim colours.',
  tags: ['laptop stand', 'computer riser', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const body = param('body', '#8b9295', { label: 'Body' });
const accent = param('accent', '#3f474c', { label: 'Accent' });
const detail = param('detail', '#bdc2c2', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('laptop-stand');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('left-rail', -82, 0, 75, 18, 240, 12, body);
addBox('right-rail', 82, 0, 75, 18, 240, 12, body);
addBox('front-lip-left', -82, -112, 87, 18, 18, 18, detail);
addBox('front-lip-right', 82, -112, 87, 18, 18, 18, detail);
addBox('rear-foot', 0, 92, 0, 200, 20, 14, accent);
addBox('front-foot', 0, -98, 0, 200, 20, 14, accent);
addBox('crossbar', 0, 0, 75, 180, 14, 10, body);

return office.model();
