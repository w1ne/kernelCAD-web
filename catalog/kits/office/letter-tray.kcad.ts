meta({
  name: 'letter-tray',
  license: 'CC0-1.0',
  title: 'Letter tray',
  description: 'Stackable letter tray with one to three shallow document shelves. Knobs: shelf count, compact or standard format, body, accent and detail colours.',
  tags: ['letter tray', 'document tray', 'paper tray', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 280,
});

const body = param('body', '#d9dde0', { label: 'Body' });
const accent = param('accent', '#68829b', { label: 'Accent' });
const detail = param('detail', '#454b50', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const tiers = param('tiers', '2', { choices: ['1', '2', '3'], label: 'Shelf count' });
const tierCount = Number(tiers.value);

const office = assembly('letter-tray');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

for (let i = 0; i < tierCount; i++) {
  const z = i * 28;
  addBox(`shelf-${i + 1}`, 0, 0, z, 210, 285, 8, body);
  addBox(`left-rail-${i + 1}`, -99, 0, z + 8, 12, 285, 20, accent);
  addBox(`right-rail-${i + 1}`, 99, 0, z + 8, 12, 285, 20, accent);
  addBox(`back-stop-${i + 1}`, 0, 135, z + 8, 190, 12, 20, accent);
}
addBox('front-label', 0, -142, 12, 42, 5, 13, detail);

return office.model();
