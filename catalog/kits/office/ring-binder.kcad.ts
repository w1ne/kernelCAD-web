// Ring binder: Standing ring binder with a spine label, cover boards and a choice of two to four visible rings. Material controls: cover polypropylene, paper, ring steel.

meta({
  name: 'ring-binder',
  license: 'CC0-1.0',
  title: 'Ring binder',
  description: "Standing ring binder with a spine label, cover boards and a choice of two to four visible rings. Controls: cover polypropylene, paper, ring steel.",
  tags: ['ring binder', 'binder', 'office folder', 'document storage', 'office'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 260,
});

const polypropylene = param('polypropylene', '#4a6c8a', { label: 'Cover polypropylene' });
const paper = param('paper', '#eee9db', { label: 'Paper' });
const steel = param('steel', '#b0b6b8', { label: 'Ring steel' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polypropylene: '#4a6c8a', paper: '#eee9db', steel: '#b0b6b8' },
  classroom: { polypropylene: '#d6644c', paper: '#f0de83', steel: '#d0a449' },
});

const rings = param('rings', '3', { choices: ['2', '3', '4'], label: 'Ring count' });
const ringCount = Number(rings.value);

const office = assembly('ring-binder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polypropylene | typeof paper | typeof steel) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polypropylene) office.part(name, partShape.color(polypropylene));
  else if (colour === paper) office.part(name, partShape.color(paper));
  else office.part(name, partShape.color(steel));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof polypropylene | typeof paper | typeof steel) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === polypropylene) office.part(name, partShape.color(polypropylene));
  else if (colour === paper) office.part(name, partShape.color(paper));
  else office.part(name, partShape.color(steel));
};

addBox('back-cover', 0, 0, 0, 225, 285, 12, polypropylene);
addBox('front-cover', 0, -24, 12, 225, 236, 8, polypropylene);
addBox('spine', -108, -10, 12, 22, 262, 12, polypropylene);
addBox('label-window', -108, -10, 25, 13, 100, 3, paper);
addBox('paper-block', 0, 0, 12, 196, 226, 15, paper);
for (let i = 0; i < ringCount; i++) {
  const y = -70 + i * (140 / Math.max(1, ringCount - 1));
  addCylinder(`ring-${i + 1}`, 13, 5, -72, y, 28, steel);
}

return office.model();
