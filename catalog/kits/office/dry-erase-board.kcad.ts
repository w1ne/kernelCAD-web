meta({
  name: 'dry-erase-board',
  license: 'CC0-1.0',
  title: 'Dry-erase board',
  description: 'Standing dry-erase board with an aluminium frame, marker tray and three-point support. Knobs: compact or standard format, board, frame and accessory colours.',
  tags: ['dry erase board', 'whiteboard', 'office board', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 200,
});

const body = param('body', '#f0f0e9', { label: 'Body' });
const accent = param('accent', '#667780', { label: 'Accent' });
const detail = param('detail', '#bd7958', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('dry-erase-board');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('writing-surface', 0, 0, 315, 440, 18, 560, body);
addBox('top-frame', 0, 0, 875, 462, 10, 14, accent);
addBox('bottom-frame', 0, 0, 301, 462, 10, 14, accent);
addBox('left-frame', -225, 0, 315, 10, 18, 560, accent);
addBox('right-frame', 225, 0, 315, 10, 18, 560, accent);
addBox('marker-tray', 0, -32, 300, 360, 52, 16, accent);
addBox('marker', 0, -34, 316, 104, 10, 8, detail);
addBox('left-leg', -140, 48, 0, 18, 20, 315, accent);
addBox('right-leg', 140, 48, 0, 18, 20, 315, accent);
addBox('leg-crossbar', 0, 48, 260, 278, 20, 20, accent);
addBox('left-foot', -140, 48, 0, 220, 24, 18, accent);
addBox('right-foot', 140, 48, 0, 220, 24, 18, accent);

return office.model();
