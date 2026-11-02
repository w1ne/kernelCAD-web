meta({
  name: 'monitor-riser',
  license: 'CC0-1.0',
  title: 'Monitor riser',
  description: 'Desktop monitor riser with a broad top shelf, two supports and an open space below. Knobs: compact or standard format, shelf, supports and trim colours.',
  tags: ['monitor riser', 'monitor stand', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const body = param('body', '#b58a5d', { label: 'Body' });
const accent = param('accent', '#41484c', { label: 'Accent' });
const detail = param('detail', '#d1c8b4', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('monitor-riser');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('top-shelf', 0, 0, 120, 380, 230, 22, body);
addBox('left-support', -142, 0, 0, 38, 190, 120, accent);
addBox('right-support', 142, 0, 0, 38, 190, 120, accent);
addBox('front-edge', 0, -113, 120, 370, 7, 10, detail);
addBox('rear-lip', 0, 112, 120, 370, 6, 10, detail);

return office.model();
