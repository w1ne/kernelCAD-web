// Office pinboard: Freestanding cork pinboard with a timber border, two feet and coloured note pins. Material controls: cork panel, timber frame, pin steel.

meta({
  name: 'office-pinboard',
  license: 'CC0-1.0',
  title: 'Office pinboard',
  description: "Freestanding cork pinboard with a timber border, two feet and coloured note pins. Controls: cork panel, timber frame, pin steel.",
  tags: ['pinboard', 'notice board', 'office board', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 160,
});

const cork = param('cork', '#b58b58', { label: 'Cork panel' });
const timber = param('timber', '#765536', { label: 'Timber frame' });
const steel = param('steel', '#5e7c8a', { label: 'Pin steel' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { cork: '#b58b58', timber: '#765536', steel: '#5e7c8a' },
  classroom: { cork: '#7b9c6a', timber: '#426f83', steel: '#cf5c47' },
});

const office = assembly('office-pinboard');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof cork | typeof timber | typeof steel) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === cork) office.part(name, partShape.color(cork));
  else if (colour === timber) office.part(name, partShape.color(timber));
  else office.part(name, partShape.color(steel));
};

addBox('cork-panel', 0, 0, 315, 420, 28, 560, timber);
addBox('top-frame', 0, 0, 875, 448, 16, 20, cork);
addBox('bottom-frame', 0, 0, 295, 448, 16, 20, cork);
addBox('left-frame', -216, 0, 315, 16, 28, 560, cork);
addBox('right-frame', 216, 0, 315, 16, 28, 560, cork);
addBox('left-leg', -160, 0, 0, 18, 18, 315, cork);
addBox('right-leg', 160, 0, 0, 18, 18, 315, cork);
addBox('pin-one', -102, -17, 760, 18, 8, 18, steel);
addBox('pin-two', 83, -17, 695, 18, 8, 18, steel);
addBox('pin-three', 0, -17, 520, 18, 8, 18, steel);

return office.model();
