meta({
  name: 'office-pinboard',
  license: 'CC0-1.0',
  title: 'Office pinboard',
  description: 'Freestanding cork pinboard with a timber border, two feet and coloured note pins. Knobs: compact or standard format, cork, frame and pin colours.',
  tags: ['pinboard', 'notice board', 'office board', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 160,
});

const body = param('body', '#ad8656', { label: 'Body' });
const accent = param('accent', '#c5a77c', { label: 'Accent' });
const detail = param('detail', '#557a92', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('office-pinboard');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('cork-panel', 0, 0, 315, 420, 28, 560, accent);
addBox('top-frame', 0, 0, 875, 448, 16, 20, body);
addBox('bottom-frame', 0, 0, 295, 448, 16, 20, body);
addBox('left-frame', -216, 0, 315, 16, 28, 560, body);
addBox('right-frame', 216, 0, 315, 16, 28, 560, body);
addBox('left-leg', -160, 0, 0, 18, 18, 315, body);
addBox('right-leg', 160, 0, 0, 18, 18, 315, body);
addBox('pin-one', -102, -17, 760, 18, 8, 18, detail);
addBox('pin-two', 83, -17, 695, 18, 8, 18, detail);
addBox('pin-three', 0, -17, 520, 18, 8, 18, detail);

return office.model();
