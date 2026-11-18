// Rubber stamp: Hand stamp with a broad rubber base, wooden handle and top cap. Material controls: handle timber, stamp rubber, cap brass.

meta({
  name: 'rubber-stamp',
  license: 'CC0-1.0',
  title: 'Rubber stamp',
  description: "Hand stamp with a broad rubber base, wooden handle and top cap. Controls: handle timber, stamp rubber, cap brass.",
  tags: ['rubber stamp', 'office supplies', 'stamp', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 160,
});

const timber = param('timber', '#9a7247', { label: 'Handle timber' });
const rubber = param('rubber', '#3d464b', { label: 'Stamp rubber' });
const brass = param('brass', '#c39b46', { label: 'Cap brass' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { timber: '#9a7247', rubber: '#3d464b', brass: '#c39b46' },
  classroom: { timber: '#4f7890', rubber: '#cc5d48', brass: '#d5ad4e' },
});

const office = assembly('rubber-stamp');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof timber | typeof rubber | typeof brass) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === timber) office.part(name, partShape.color(timber));
  else if (colour === rubber) office.part(name, partShape.color(rubber));
  else office.part(name, partShape.color(brass));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof timber | typeof rubber | typeof brass) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === timber) office.part(name, partShape.color(timber));
  else if (colour === rubber) office.part(name, partShape.color(rubber));
  else office.part(name, partShape.color(brass));
};

addBox('rubber-base', 0, 0, 0, 58, 42, 17, rubber);
addBox('wooden-neck', 0, 0, 17, 31, 28, 22, timber);
addCylinder('handle', 28, 15, 0, 0, 39, timber);
addBox('top-cap', 0, 0, 66, 34, 34, 7, brass);
addBox('marking-face', 0, 0, 0, 44, 27, 3, brass);

return office.model();
