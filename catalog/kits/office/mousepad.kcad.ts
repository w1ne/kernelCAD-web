// Mouse pad: Flat desktop mouse pad with stitched border, wrist-side edge and subtle center mark. Material controls: woven fabric, non-slip rubber, cushion foam.

meta({
  name: 'mousepad',
  license: 'CC0-1.0',
  title: 'Mouse pad',
  description: "Flat desktop mouse pad with stitched border, wrist-side edge and subtle center mark. Controls: woven fabric, non-slip rubber, cushion foam.",
  tags: ['mouse pad', 'mouse mat', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const fabric = param('fabric', '#4d6687', { label: 'Woven fabric' });
const rubber = param('rubber', '#2f3438', { label: 'Non-slip rubber' });
const foam = param('foam', '#b5aa93', { label: 'Cushion foam' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { fabric: '#4d6687', rubber: '#2f3438', foam: '#b5aa93' },
  classroom: { fabric: '#d2604b', rubber: '#678454', foam: '#e0bf65' },
});

const office = assembly('mousepad');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof fabric | typeof rubber | typeof foam) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === fabric) office.part(name, partShape.color(fabric));
  else if (colour === rubber) office.part(name, partShape.color(rubber));
  else office.part(name, partShape.color(foam));
};

addBox('pad', 0, 0, 0, 230, 195, 5, fabric);
addBox('north-stitch', 0, 93, 5, 218, 2, 2, rubber);
addBox('south-stitch', 0, -93, 5, 218, 2, 2, rubber);
addBox('east-stitch', 113, 0, 5, 2, 184, 2, rubber);
addBox('west-stitch', -113, 0, 5, 2, 184, 2, rubber);
addBox('center-mark', 0, 0, 5, 22, 3, 2, foam);

return office.model();
