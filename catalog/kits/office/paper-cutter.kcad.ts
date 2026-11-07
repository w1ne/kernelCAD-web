// Paper cutter: Desktop guillotine paper cutter with a measurement bed, alignment fence and hinged cutting arm. Material controls: powder-coated steel, stainless steel blade, handle polymer.

meta({
  name: 'paper-cutter',
  license: 'CC0-1.0',
  title: 'Paper cutter',
  description: "Desktop guillotine paper cutter with a measurement bed, alignment fence and hinged cutting arm. Controls: powder-coated steel, stainless steel blade, handle polymer.",
  tags: ['paper cutter', 'guillotine trimmer', 'office equipment', 'office', 'stationery'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const powderCoatedSteel = param('powderCoatedSteel', '#59727d', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#aeb7ba', { label: 'Stainless steel blade' });
const polymer = param('polymer', '#30383d', { label: 'Handle polymer' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { powderCoatedSteel: '#59727d', stainlessSteel: '#aeb7ba', polymer: '#30383d' },
  classroom: { powderCoatedSteel: '#d6634a', stainlessSteel: '#d0a84d', polymer: '#4e8092' },
});

const office = assembly('paper-cutter');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof powderCoatedSteel | typeof stainlessSteel | typeof polymer) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === powderCoatedSteel) office.part(name, partShape.color(powderCoatedSteel));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(polymer));
};

addBox('base', 0, 0, 0, 310, 230, 13, powderCoatedSteel);
addBox('measurement-bed', 0, 0, 13, 284, 204, 4, polymer);
addBox('rear-fence', 0, 98, 17, 285, 9, 14, stainlessSteel);
addBox('pivot-post', -132, 32, 17, 16, 18, 62, stainlessSteel);
addBox('cutting-arm', 0, 26, 70, 265, 15, 12, stainlessSteel);
addBox('blade-edge', 0, 16, 69, 252, 5, 3, polymer);
addBox('handle', 119, 22, 70, 22, 28, 16, powderCoatedSteel);

return office.model();
