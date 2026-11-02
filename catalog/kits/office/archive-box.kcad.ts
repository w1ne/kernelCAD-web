meta({
  name: 'archive-box',
  license: 'CC0-1.0',
  title: 'Archive box',
  description: 'Desktop document archive box with a lift-off lid, hand slots and front label. Knobs: compact or standard format, box, lid and label colours.',
  tags: ['archive box', 'document box', 'storage', 'office', 'stationery'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const body = param('body', '#bf9b63', { label: 'Body' });
const accent = param('accent', '#d7bc86', { label: 'Accent' });
const detail = param('detail', '#47494b', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('archive-box');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('box-body', 0, 0, 0, 260, 350, 210, body);
addBox('front-label', 0, -177, 125, 105, 4, 32, accent);
addBox('label-mark', 0, -180, 130, 50, 3, 6, detail);
addBox('lid', 0, 0, 210, 276, 366, 18, accent);
addBox('lid-grip', 0, -184, 210, 58, 8, 14, body);

return office.model();
