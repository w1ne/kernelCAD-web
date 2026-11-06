// Paper shredder: Compact office paper shredder with a feed slot, control panel and removable collection bin. Material controls: housing polymer, cutter steel, bin window glass.

meta({
  name: 'paper-shredder',
  license: 'CC0-1.0',
  title: 'Paper shredder',
  description: "Compact office paper shredder with a feed slot, control panel and removable collection bin. Controls: housing polymer, cutter steel, bin window glass.",
  tags: ['paper shredder', 'office machine', 'document disposal', 'office', 'equipment'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 240,
});

const polymer = param('polymer', '#b9c4c4', { label: 'Housing polymer' });
const steel = param('steel', '#464b4d', { label: 'Cutter steel' });
const glass = param('glass', '#73948b', { label: 'Bin window glass' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#b9c4c4', steel: '#464b4d', glass: '#73948b' },
  classroom: { polymer: '#4e758c', steel: '#d25e49', glass: '#d4b24d' },
});

const office = assembly('paper-shredder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof steel | typeof glass) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === steel) office.part(name, partShape.color(steel));
  else office.part(name, partShape.color(glass));
};

addBox('cabinet', 0, 0, 0, 300, 250, 420, polymer);
addBox('top-cap', 0, 0, 420, 312, 260, 18, steel);
addBox('feed-slot', 0, 0, 438, 190, 7, 3, glass);
addBox('control-panel', 107, -72, 360, 62, 28, 44, steel);
addBox('power-button', 107, -87, 380, 20, 4, 12, glass);
addBox('bin-window', 0, -127, 230, 118, 4, 92, glass);
addBox('left-foot', -118, 0, 0, 24, 220, 16, steel);
addBox('right-foot', 118, 0, 0, 24, 220, 16, steel);
// The paired wheels make the tall collection cabinet read as a mobile shredder.
office.part('front-caster-left', cylinder(20, 15).rotateX(90).translate(-116, -124, 17).color(steel));
office.part('front-caster-right', cylinder(20, 15).rotateX(90).translate(116, -124, 17).color(steel));

return office.model();
