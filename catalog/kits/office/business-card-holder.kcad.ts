meta({
  name: 'business-card-holder',
  license: 'CC0-1.0',
  title: 'Business card holder',
  description: 'Angled desktop business-card holder with a visible card stack and front stop. Knobs: compact or standard format, holder, card and trim colours.',
  tags: ['business card holder', 'card holder', 'office', 'stationery', 'desk accessory'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 130,
});

const body = param('body', '#90989d', { label: 'Body' });
const accent = param('accent', '#eeeae0', { label: 'Accent' });
const detail = param('detail', '#3e464b', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('business-card-holder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('base', 0, 0, 0, 125, 85, 8, body);
addBox('back-rest', 0, 31, 8, 125, 12, 75, body);
addBox('card-stack', 0, 5, 13, 104, 55, 16, accent);
addBox('front-stop', 0, -35, 8, 125, 10, 28, body);
addBox('front-mark', 0, -41, 16, 58, 3, 8, detail);

return office.model();
