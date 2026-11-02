meta({
  name: 'tape-dispenser',
  license: 'CC0-1.0',
  title: 'Tape dispenser',
  description: 'Weighted desktop tape dispenser with a visible roll, spindle and serrated cutting edge. Knobs: compact or standard format, body, tape and cutter colours.',
  tags: ['tape dispenser', 'office supplies', 'adhesive tape', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 220,
});

const body = param('body', '#444b50', { label: 'Body' });
const accent = param('accent', '#c3c7c8', { label: 'Accent' });
const detail = param('detail', '#6c8b9d', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('tape-dispenser');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('weighted-base', 0, 0, 0, 130, 56, 18, body);
addCylinder('tape-roll', 18, 30, -5, 0, 18, detail);
addCylinder('hub', 21, 8, -5, 0, 16, accent);
addBox('cutting-arm', 43, -10, 16, 46, 12, 26, body);
addBox('serrated-edge', 43, -17, 40, 46, 5, 4, accent);

return office.model();
