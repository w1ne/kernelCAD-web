// Desk calendar: Standing tear-off desk calendar with ring binding and adjustable page count. Material controls: calendar paper, chipboard stand, steel wire.

meta({
  name: 'desk-calendar',
  license: 'CC0-1.0',
  title: 'Desk calendar',
  description: "Standing tear-off desk calendar with ring binding and adjustable page count. Controls: calendar paper, chipboard stand, steel wire.",
  tags: ['desk calendar', 'calendar', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 260,
});

const paper = param('paper', '#f0eee5', { label: 'Calendar paper' });
const chipboard = param('chipboard', '#416f89', { label: 'Chipboard stand' });
const steelWire = param('steelWire', '#bbc0c2', { label: 'Steel wire' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { paper: '#f0eee5', chipboard: '#416f89', steelWire: '#bbc0c2' },
  classroom: { paper: '#f4df83', chipboard: '#d96b4e', steelWire: '#637b8b' },
});

const pages = param('pages', '6', { choices: ['4', '6', '12'], label: 'Visible pages' });
const pageCount = Number(pages.value);

const office = assembly('desk-calendar');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof paper | typeof chipboard | typeof steelWire) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === paper) office.part(name, partShape.color(paper));
  else if (colour === chipboard) office.part(name, partShape.color(chipboard));
  else office.part(name, partShape.color(steelWire));
};

addBox('stand-foot', 0, 0, 0, 180, 55, 12, chipboard);
addBox('calendar-back', 0, 0, 12, 180, 22, 155, steelWire);
const pageDepth = 4 + pageCount * 1.2;
addBox('page-stack', 0, -8, 20, 166, pageDepth, 132, paper);
addBox('date-band', 0, -14, 106, 112, 3, 5, chipboard);
addBox('date-block', 0, -14, 44, 86, 3, 8, chipboard);
for (let i = 0; i < 5; i++) addBox(`binding-loop-${i + 1}`, -66 + i * 33, -13, 145, 8, 8, 12, chipboard);

return office.model();
