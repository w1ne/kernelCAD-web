meta({
  name: 'envelope-stack',
  license: 'CC0-1.0',
  title: 'Envelope stack',
  description: 'Small stack of office envelopes with visible flap panels and paper edges. Knobs: compact or standard format, envelope and flap colours.',
  tags: ['envelopes', 'mail', 'paper', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const body = param('body', '#eae6d9', { label: 'Body' });
const accent = param('accent', '#d2cdbc', { label: 'Accent' });
const detail = param('detail', '#557b97', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('envelope-stack');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('bottom-envelope', 0, 0, 0, 220, 115, 7, accent);
addBox('middle-envelope', 0, 0, 7, 220, 115, 7, body);
addBox('top-envelope', 0, 0, 14, 220, 115, 7, accent);
addBox('flap-panel', 0, 41, 21, 180, 5, 4, body);
addBox('address-block', -43, -15, 21, 72, 36, 2, detail);

return office.model();
