// Keyboard wrist rest: Low padded wrist rest with a non-slip base and stitched top band. Material controls: cover fabric, cushion foam, non-slip rubber.

meta({
  name: 'wrist-rest',
  license: 'CC0-1.0',
  title: 'Keyboard wrist rest',
  description: "Low padded wrist rest with a non-slip base and stitched top band. Controls: cover fabric, cushion foam, non-slip rubber.",
  tags: ['wrist rest', 'keyboard wrist rest', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 100,
});

const fabric = param('fabric', '#3d617a', { label: 'Cover fabric' });
const foam = param('foam', '#bbab90', { label: 'Cushion foam' });
const rubber = param('rubber', '#31393e', { label: 'Non-slip rubber' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { fabric: '#3d617a', foam: '#bbab90', rubber: '#31393e' },
  classroom: { fabric: '#d2614a', foam: '#d9b75b', rubber: '#66834f' },
});

const office = assembly('wrist-rest');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof fabric | typeof foam | typeof rubber) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === fabric) office.part(name, partShape.color(fabric));
  else if (colour === foam) office.part(name, partShape.color(foam));
  else office.part(name, partShape.color(rubber));
};

addBox('non-slip-base', 0, 0, 0, 315, 70, 8, foam);
addBox('cushion', 0, 0, 8, 315, 66, 24, fabric);
addBox('seam-front', 0, -32, 32, 300, 3, 2, rubber);
addBox('end-cap-left', -151, 0, 8, 10, 60, 22, fabric);
addBox('end-cap-right', 151, 0, 8, 10, 60, 22, fabric);

return office.model();
