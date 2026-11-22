// Monitor riser: Desktop monitor riser with a broad top shelf, two supports and an open space below. Material controls: timber shelf, support steel, edge rubber.

meta({
  name: 'monitor-riser',
  license: 'CC0-1.0',
  title: 'Monitor riser',
  description: "Desktop monitor riser with a broad top shelf, two supports and an open space below. Controls: timber shelf, support steel, edge rubber.",
  tags: ['monitor riser', 'monitor stand', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const timber = param('timber', '#ae8153', { label: 'Timber shelf' });
const steel = param('steel', '#3d484e', { label: 'Support steel' });
const rubber = param('rubber', '#ddd2bb', { label: 'Edge rubber' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { timber: '#ae8153', steel: '#3d484e', rubber: '#ddd2bb' },
  classroom: { timber: '#537582', steel: '#d36549', rubber: '#d4ad48' },
});

const office = assembly('monitor-riser');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof timber | typeof steel | typeof rubber) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === timber) office.part(name, partShape.color(timber));
  else if (colour === steel) office.part(name, partShape.color(steel));
  else office.part(name, partShape.color(rubber));
};

addBox('top-shelf', 0, 0, 120, 380, 230, 22, timber);
addBox('left-support', -142, 0, 0, 38, 190, 120, steel);
addBox('right-support', 142, 0, 0, 38, 190, 120, steel);
addBox('front-edge', 0, -113, 120, 370, 7, 10, rubber);
addBox('rear-lip', 0, 112, 120, 370, 6, 10, rubber);

return office.model();
