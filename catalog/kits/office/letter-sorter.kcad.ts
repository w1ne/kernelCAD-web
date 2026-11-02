meta({
  name: 'letter-sorter',
  license: 'CC0-1.0',
  title: 'Letter sorter',
  description: 'Upright desktop sorter with two or three stepped compartments for incoming papers. Knobs: shelf count, compact or standard format, body, accent and detail colours.',
  tags: ['letter sorter', 'paper organizer', 'document organizer', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 260,
});

const body = param('body', '#e4e0d4', { label: 'Body' });
const accent = param('accent', '#416b8b', { label: 'Accent' });
const detail = param('detail', '#333c45', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const shelves = param('shelves', '3', { choices: ['2', '3'], label: 'Compartments' });
const shelfCount = Number(shelves.value);

const office = assembly('letter-sorter');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('base', 0, 0, 0, 230, 120, 12, body);
for (let i = 0; i < shelfCount; i++) {
  const y = -38 + i * 34;
  const z = 24 + i * 37;
  addBox(`divider-${i + 1}`, 0, y, z, 210, 12, 76, accent);
  addBox(`floor-${i + 1}`, 0, y - 15, z - 8, 210, 48, 8, body);
}
addBox('back-panel', 0, 52, 22, 230, 12, 150, detail);

return office.model();
