meta({
  name: 'memo-pad',
  license: 'CC0-1.0',
  title: 'Memo pad',
  description: 'Tear-off memo pad with a coloured backing and a selectable sheet count. Knobs: 20, 40 or 60 sheets, compact or standard format, paper, backing and accent colours.',
  tags: ['memo pad', 'notepad', 'notes', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 100,
});

const body = param('body', '#f0ede2', { label: 'Body' });
const accent = param('accent', '#6885a5', { label: 'Accent' });
const detail = param('detail', '#454c52', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const sheets = param('sheets', '40', { choices: ['20', '40', '60'], label: 'Sheet count' });
const sheetHeight = Number(sheets.value) / 8;

const office = assembly('memo-pad');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('backing', 0, 0, 0, 115, 145, 7, accent);
addBox('paper-stack', 0, 0, 7, 108, 138, sheetHeight, body);
addBox('top-glue-strip', 0, 66, 7 + sheetHeight, 108, 6, 4, detail);
addBox('page-corner', 43, 49, 7 + sheetHeight, 14, 13, 2, accent);

return office.model();
