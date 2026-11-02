meta({
  name: 'notebook',
  license: 'CC0-1.0',
  title: 'Notebook',
  description: 'Pocket notebook with a solid cover, page block, spine and elastic closure. Knobs: compact or standard format, cover, pages and closure colours.',
  tags: ['notebook', 'journal', 'paper', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const body = param('body', '#41677a', { label: 'Body' });
const accent = param('accent', '#eeeade', { label: 'Accent' });
const detail = param('detail', '#bd704e', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('notebook');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('page-block', 0, 0, 0, 142, 205, 18, accent);
addBox('front-cover', 0, -5, 18, 150, 207, 7, body);
addBox('back-cover', 0, 5, 18, 150, 207, 7, body);
addBox('spine', -71, 0, 18, 9, 207, 8, detail);
addBox('elastic-band', 65, -4, 25, 6, 216, 3, detail);
addBox('title-panel', 0, 35, 26, 70, 70, 2, accent);

return office.model();
