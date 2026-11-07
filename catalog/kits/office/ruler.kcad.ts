meta({
  name: 'ruler',
  license: 'CC0-1.0',
  title: 'Office ruler',
  description: 'Flat office ruler with alternating length marks and a contrasting zero end. Knobs: compact or standard format, body, scale and end colours.',
  tags: ['ruler', 'measuring tool', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 220,
});

const body = param('body', '#d7c594', { label: 'Body' });
const accent = param('accent', '#414950', { label: 'Accent' });
const detail = param('detail', '#b55b4d', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('ruler');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('ruler-body', 0, 0, 0, 250, 35, 5, body);
addBox('zero-end', -116, 0, 5, 18, 35, 3, detail);
for (let i = 0; i < 10; i++) {
  const x = -96 + i * 21;
  const h = i % 2 === 0 ? 15 : 9;
  addBox(`tick-${i + 1}`, x, 9, 5, 2, h, 2, accent);
}
addBox('scale-line', 0, -12, 5, 208, 2, 2, accent);

return office.model();
