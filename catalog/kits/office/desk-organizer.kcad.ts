// Desk organizer: Multi-compartment desktop organizer for papers and small stationery. Material controls: timber, stainless steel, label paper.

meta({
  name: 'desk-organizer',
  license: 'CC0-1.0',
  title: 'Desk organizer',
  description: "Multi-compartment desktop organizer for papers and small stationery. Controls: timber, stainless steel, label paper.",
  tags: ['desk organizer', 'desktop organizer', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const timber = param('timber', '#ad8155', { label: 'Timber' });
const stainlessSteel = param('stainlessSteel', '#bfc3c4', { label: 'Stainless steel' });
const labelPaper = param('labelPaper', '#eae4d3', { label: 'Label paper' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { timber: '#ad8155', stainlessSteel: '#bfc3c4', labelPaper: '#eae4d3' },
  classroom: { timber: '#426f75', stainlessSteel: '#d1a340', labelPaper: '#d96f4e' },
});

const office = assembly('desk-organizer');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof timber | typeof stainlessSteel | typeof labelPaper) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === timber) office.part(name, partShape.color(timber));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(labelPaper));
};

addBox('base', 0, 0, 0, 220, 150, 12, timber);
addBox('back-wall', 0, 67, 12, 220, 16, 104, timber);
addBox('left-wall', -102, 0, 12, 16, 150, 60, timber);
addBox('right-wall', 102, 0, 12, 16, 150, 60, timber);
addBox('divider-a', -35, -4, 12, 10, 128, 52, stainlessSteel);
addBox('divider-b', 36, -4, 12, 10, 128, 52, stainlessSteel);
addBox('label', 0, 72, 71, 70, 4, 18, labelPaper);

return office.model();
