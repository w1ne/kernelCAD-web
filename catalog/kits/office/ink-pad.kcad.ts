meta({
  name: 'ink-pad',
  license: 'CC0-1.0',
  title: 'Ink pad',
  description: 'Lidded desktop ink pad with a soft insert and a small colour marker. Knobs: compact or standard format, case, ink and marker colours.',
  tags: ['ink pad', 'stamp pad', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const body = param('body', '#424b52', { label: 'Body' });
const accent = param('accent', '#567c96', { label: 'Accent' });
const detail = param('detail', '#c8c5b9', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('ink-pad');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('case', 0, 0, 0, 100, 70, 17, body);
addBox('ink-surface', 0, 0, 17, 84, 55, 8, accent);
addBox('lid', 0, 0, 25, 108, 76, 7, detail);
addBox('brand-mark', 0, 0, 32, 28, 3, 2, body);

return office.model();
