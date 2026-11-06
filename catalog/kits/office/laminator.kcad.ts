// Desktop laminator: Desktop pouch laminator with feed slot, output lip and simple status controls. Material controls: housing polymer, feed tray aluminum, roller rubber.

meta({
  name: 'laminator',
  license: 'CC0-1.0',
  title: 'Desktop laminator',
  description: "Desktop pouch laminator with feed slot, output lip and simple status controls. Controls: housing polymer, feed tray aluminum, roller rubber.",
  tags: ['laminator', 'office machine', 'document finishing', 'office', 'equipment'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 230,
});

const polymer = param('polymer', '#48525b', { label: 'Housing polymer' });
const aluminum = param('aluminum', '#a5adb0', { label: 'Feed tray aluminum' });
const rubber = param('rubber', '#31373c', { label: 'Roller rubber' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#48525b', aluminum: '#a5adb0', rubber: '#31373c' },
  classroom: { polymer: '#557f91', aluminum: '#d8a84f', rubber: '#cc5e49' },
});

const office = assembly('laminator');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof aluminum | typeof rubber) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === aluminum) office.part(name, partShape.color(aluminum));
  else office.part(name, partShape.color(rubber));
};

addBox('housing', 0, 0, 0, 320, 150, 72, polymer);
addBox('top-panel', 0, 0, 72, 306, 134, 8, aluminum);
addBox('feed-slot', 0, -77, 26, 264, 5, 14, aluminum);
addBox('output-lip', 0, 69.5, 10, 278, 22, 9, polymer);
addBox('status-window', -109, 24, 80, 42, 4, 15, rubber);
addBox('button', 102, 22, 80, 20, 5, 17, rubber);
addBox('left-foot', -120, 0, 0, 34, 130, 12, aluminum);
addBox('right-foot', 120, 0, 0, 34, 130, 12, aluminum);
// Exposed roller arcs give the front feed opening a readable paper path.
office.part('feed-roller-lower', cylinder(260, 6).rotateY(90).translate(-130, -74, 20).color(rubber));
office.part('feed-roller-upper', cylinder(260, 6).rotateY(90).translate(-130, -74, 36).color(rubber));

return office.model();
