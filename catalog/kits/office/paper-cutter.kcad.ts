meta({
  name: 'paper-cutter',
  license: 'CC0-1.0',
  title: 'Paper cutter',
  description: 'Desktop guillotine paper cutter with a measurement bed, alignment fence and hinged cutting arm. Knobs: compact or standard format, base, blade and fence colours.',
  tags: ['paper cutter', 'guillotine trimmer', 'office equipment', 'office', 'stationery'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#667b86', { label: 'Body' });
const accent = param('accent', '#42494d', { label: 'Accent' });
const detail = param('detail', '#c5c7c4', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('paper-cutter');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('base', 0, 0, 0, 310, 230, 13, body);
addBox('measurement-bed', 0, 0, 13, 284, 204, 4, detail);
addBox('rear-fence', 0, 98, 17, 285, 9, 14, accent);
addBox('pivot-post', -132, 32, 17, 16, 18, 62, accent);
addBox('cutting-arm', 0, 26, 70, 265, 15, 12, accent);
addBox('blade-edge', 0, 16, 69, 252, 5, 3, detail);
addBox('handle', 119, 22, 70, 22, 28, 16, body);

return office.model();
