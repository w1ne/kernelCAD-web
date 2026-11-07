// Office footrest: Low desktop footrest with a gently stepped top, broad platform and stable side feet. Material controls: platform polymer, grip rubber, cushion foam.

meta({
  name: 'footrest',
  license: 'CC0-1.0',
  title: 'Office footrest',
  description: "Low desktop footrest with a gently stepped top, broad platform and stable side feet. Controls: platform polymer, grip rubber, cushion foam.",
  tags: ['footrest', 'office foot rest', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 130,
});

const polymer = param('polymer', '#3c484d', { label: 'Platform polymer' });
const rubber = param('rubber', '#7c898b', { label: 'Grip rubber' });
const foam = param('foam', '#d0cab9', { label: 'Cushion foam' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#3c484d', rubber: '#7c898b', foam: '#d0cab9' },
  classroom: { polymer: '#557a8a', rubber: '#df674d', foam: '#e2be6a' },
});

const office = assembly('footrest');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof rubber | typeof foam) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === rubber) office.part(name, partShape.color(rubber));
  else office.part(name, partShape.color(foam));
};

addBox('base', 0, 0, 0, 310, 235, 28, polymer);
addBox('left-foot', -114, 0, 28, 58, 130, 42, rubber);
addBox('right-foot', 114, 0, 28, 58, 130, 42, rubber);
addBox('top-pad', 0, -12, 70, 290, 200, 12, foam);
addBox('grip-strip', 0, -12, 82, 230, 10, 3, polymer);

return office.model();
