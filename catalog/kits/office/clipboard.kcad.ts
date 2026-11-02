meta({
  name: 'clipboard',
  license: 'CC0-1.0',
  title: 'Clipboard',
  description: 'Portable writing board with paper stack, broad top clip and a hanging hole marker. Knobs: compact or standard format, board, paper and clip colours.',
  tags: ['clipboard', 'writing board', 'paperwork', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 160,
});

const body = param('body', '#9a744a', { label: 'Body' });
const accent = param('accent', '#f0eee5', { label: 'Accent' });
const detail = param('detail', '#6a7074', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('clipboard');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('board', 0, 0, 0, 225, 315, 10, body);
addBox('paper', 0, -7, 10, 200, 270, 4, accent);
addBox('clip-plate', 0, 143, 14, 76, 26, 7, detail);
addBox('clip-lip', 0, 131, 14, 38, 7, 7, detail);
addCylinder('hanging-eyelet', 8, 8, 0, 143, 22, detail);

return office.model();
