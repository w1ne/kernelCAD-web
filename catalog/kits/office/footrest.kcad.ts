meta({
  name: 'footrest',
  license: 'CC0-1.0',
  title: 'Office footrest',
  description: 'Low desktop footrest with a gently stepped top, broad platform and stable side feet. Knobs: compact or standard format, platform, feet and grip colours.',
  tags: ['footrest', 'office foot rest', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 130,
});

const body = param('body', '#50595e', { label: 'Body' });
const accent = param('accent', '#75838a', { label: 'Accent' });
const detail = param('detail', '#c9c6bb', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('footrest');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('base', 0, 0, 0, 310, 235, 28, body);
addBox('left-foot', -114, 0, 28, 58, 130, 42, accent);
addBox('right-foot', 114, 0, 28, 58, 130, 42, accent);
addBox('top-pad', 0, -12, 70, 290, 200, 12, detail);
addBox('grip-strip', 0, -12, 82, 230, 10, 3, body);

return office.model();
