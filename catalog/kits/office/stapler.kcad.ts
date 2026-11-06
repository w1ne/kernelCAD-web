// Stapler: Desktop stapler with a long base, hinged upper arm and rear hinge pin. Material controls: powder-coated steel, stainless steel, grip rubber.

meta({
  name: 'stapler',
  license: 'CC0-1.0',
  title: 'Stapler',
  description: "Desktop stapler with a long base, hinged upper arm and rear hinge pin. Controls: powder-coated steel, stainless steel, grip rubber.",
  tags: ['stapler', 'staple gun', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 130,
});

const powderCoatedSteel = param('powderCoatedSteel', '#506a7d', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#bdc1c1', { label: 'Stainless steel' });
const rubber = param('rubber', '#33383a', { label: 'Grip rubber' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { powderCoatedSteel: '#506a7d', stainlessSteel: '#bdc1c1', rubber: '#33383a' },
  classroom: { powderCoatedSteel: '#d1644b', stainlessSteel: '#547e8f', rubber: '#d3aa4a' },
});

const office = assembly('stapler');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof powderCoatedSteel | typeof stainlessSteel | typeof rubber) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === powderCoatedSteel) office.part(name, partShape.color(powderCoatedSteel));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(rubber));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof powderCoatedSteel | typeof stainlessSteel | typeof rubber) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === powderCoatedSteel) office.part(name, partShape.color(powderCoatedSteel));
  else if (colour === stainlessSteel) office.part(name, partShape.color(stainlessSteel));
  else office.part(name, partShape.color(rubber));
};

addBox('base', 0, 0, 0, 145, 48, 12, powderCoatedSteel);
addBox('upper-arm', 0, 9, 22, 142, 34, 16, stainlessSteel);
addBox('nose', 66, -4, 12, 18, 39, 10, rubber);
addCylinder('hinge', 8, 6, -61, 8, 16, rubber);
addBox('grip-pad', -4, 9, 38, 88, 27, 3, powderCoatedSteel);

return office.model();
