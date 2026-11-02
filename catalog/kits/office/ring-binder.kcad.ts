meta({
  name: 'ring-binder',
  license: 'CC0-1.0',
  title: 'Ring binder',
  description: 'Standing ring binder with a spine label, cover boards and a choice of two to four visible rings. Knobs: ring count, compact or standard format, cover, paper and hardware colours.',
  tags: ['ring binder', 'binder', 'office folder', 'document storage', 'office'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 260,
});

const body = param('body', '#315d7b', { label: 'Body' });
const accent = param('accent', '#e6e4dc', { label: 'Accent' });
const detail = param('detail', '#bbc2c7', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const rings = param('rings', '3', { choices: ['2', '3', '4'], label: 'Ring count' });
const ringCount = Number(rings.value);

const office = assembly('ring-binder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('back-cover', 0, 0, 0, 225, 285, 12, body);
addBox('front-cover', 0, -24, 12, 225, 236, 8, body);
addBox('spine', -108, -10, 12, 22, 262, 12, body);
addBox('label-window', -108, -10, 25, 13, 100, 3, accent);
addBox('paper-block', 0, 0, 12, 196, 226, 15, accent);
for (let i = 0; i < ringCount; i++) {
  const y = -70 + i * (140 / Math.max(1, ringCount - 1));
  addCylinder(`ring-${i + 1}`, 13, 5, -72, y, 28, detail);
}

return office.model();
