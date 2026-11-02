meta({
  name: 'desk-organizer',
  license: 'CC0-1.0',
  title: 'Desk organizer',
  description: 'Multi-compartment desktop organizer for papers and small stationery. Knobs: compact or standard format, body, dividers and label colours.',
  tags: ['desk organizer', 'desktop organizer', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#816744', { label: 'Body' });
const accent = param('accent', '#b9b1a1', { label: 'Accent' });
const detail = param('detail', '#4b555c', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('desk-organizer');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('base', 0, 0, 0, 220, 150, 12, body);
addBox('back-wall', 0, 67, 12, 220, 16, 104, body);
addBox('left-wall', -102, 0, 12, 16, 150, 60, body);
addBox('right-wall', 102, 0, 12, 16, 150, 60, body);
addBox('divider-a', -35, -4, 12, 10, 128, 52, accent);
addBox('divider-b', 36, -4, 12, 10, 128, 52, accent);
addBox('label', 0, 72, 71, 70, 4, 18, detail);

return office.model();
