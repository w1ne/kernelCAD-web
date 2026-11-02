meta({
  name: 'desk-calendar',
  license: 'CC0-1.0',
  title: 'Desk calendar',
  description: 'Standing tear-off desk calendar with ring binding and adjustable page count. Knobs: 4, 6 or 12 pages, compact or standard format, pages, stand and binding colours.',
  tags: ['desk calendar', 'calendar', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 260,
});

const body = param('body', '#f0ece1', { label: 'Body' });
const accent = param('accent', '#52748c', { label: 'Accent' });
const detail = param('detail', '#41484c', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const pages = param('pages', '6', { choices: ['4', '6', '12'], label: 'Visible pages' });
const pageCount = Number(pages.value);

const office = assembly('desk-calendar');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('stand-foot', 0, 0, 0, 180, 55, 12, accent);
addBox('calendar-back', 0, 0, 12, 180, 22, 155, detail);
const pageDepth = 4 + pageCount * 1.2;
addBox('page-stack', 0, -8, 20, 166, pageDepth, 132, body);
addBox('date-band', 0, -14, 106, 112, 3, 5, accent);
addBox('date-block', 0, -14, 44, 86, 3, 8, accent);
for (let i = 0; i < 5; i++) addBox(`binding-loop-${i + 1}`, -66 + i * 33, -13, 145, 8, 8, 12, accent);

return office.model();
