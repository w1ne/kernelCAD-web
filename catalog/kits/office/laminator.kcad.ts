meta({
  name: 'laminator',
  license: 'CC0-1.0',
  title: 'Desktop laminator',
  description: 'Desktop pouch laminator with feed slot, output lip and simple status controls. Knobs: compact or standard format, housing, feed guide and controls colours.',
  tags: ['laminator', 'office machine', 'document finishing', 'office', 'equipment'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const body = param('body', '#c7c9c5', { label: 'Body' });
const accent = param('accent', '#485159', { label: 'Accent' });
const detail = param('detail', '#698c9c', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('laminator');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('housing', 0, 0, 0, 320, 150, 72, body);
addBox('top-panel', 0, 0, 72, 306, 134, 8, accent);
addBox('feed-slot', 0, -77, 26, 264, 5, 14, accent);
addBox('output-lip', 0, 69.5, 10, 278, 22, 9, body);
addBox('status-window', -109, 24, 80, 42, 4, 15, detail);
addBox('button', 102, 22, 80, 20, 5, 17, detail);
addBox('left-foot', -120, 0, 0, 34, 130, 12, accent);
addBox('right-foot', 120, 0, 0, 34, 130, 12, accent);

return office.model();
