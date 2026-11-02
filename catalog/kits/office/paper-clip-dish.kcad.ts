meta({
  name: 'paper-clip-dish',
  license: 'CC0-1.0',
  title: 'Paper clip dish',
  description: 'Small desk dish with a recessed-looking tray floor and several visible paper clips. Knobs: compact or standard format, dish, clips and accent colours.',
  tags: ['paper clip holder', 'paper clip dish', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#4e6a7b', { label: 'Body' });
const accent = param('accent', '#b8bec1', { label: 'Accent' });
const detail = param('detail', '#d8bd78', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('paper-clip-dish');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('tray-floor', 0, 0, 0, 92, 92, 8, body);
addBox('north-wall', 0, 43, 8, 92, 6, 12, body);
addBox('south-wall', 0, -43, 8, 92, 6, 12, body);
addBox('east-wall', 43, 0, 8, 6, 92, 12, body);
addBox('west-wall', -43, 0, 8, 6, 92, 12, body);
addBox('clip-one', -18, 5, 8, 33, 4, 3, accent);
addBox('clip-two', 8, -8, 9, 34, 4, 3, accent);
addBox('clip-three', 0, 18, 10, 30, 4, 3, detail);

return office.model();
