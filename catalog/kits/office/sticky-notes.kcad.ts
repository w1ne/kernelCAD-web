meta({
  name: 'sticky-notes',
  license: 'CC0-1.0',
  title: 'Sticky notes',
  description: 'Square adhesive-note pad with layered paper edges and a lifted corner marker. Knobs: sheet count, compact or standard format, paper, backing and note colours.',
  tags: ['sticky notes', 'sticky note pad', 'memo', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 110,
});

const body = param('body', '#f3df75', { label: 'Body' });
const accent = param('accent', '#f5f1e5', { label: 'Accent' });
const detail = param('detail', '#6b87a2', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const sheets = param('sheets', '100', { choices: ['50', '100', '200'], label: 'Sheet count' });
const sheetHeight = Number(sheets.value) / 14;

const office = assembly('sticky-notes');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('backing', 0, 0, 0, 78, 78, 5, detail);
addBox('paper-stack', 0, 0, 5, 74, 74, sheetHeight, body);
addBox('lifted-corner', 22, 21, 5 + sheetHeight, 25, 25, 2, accent);

return office.model();
