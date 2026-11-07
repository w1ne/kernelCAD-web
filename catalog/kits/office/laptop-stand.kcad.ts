// Laptop stand: Desktop laptop riser with two support rails, raised front lips and a stable rear foot. Material controls: anodized aluminum, silicone pads, stainless steel.

meta({
  name: 'laptop-stand',
  license: 'CC0-1.0',
  title: 'Laptop stand',
  description: "Desktop laptop riser with two support rails, raised front lips and a stable rear foot. Controls: anodized aluminum, silicone pads, stainless steel.",
  tags: ['laptop stand', 'computer riser', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const anodizedAluminum = param('anodizedAluminum', '#a8afb2', { label: 'Anodized aluminum' });
const silicone = param('silicone', '#353c41', { label: 'Silicone pads' });
const stainlessSteel = param('stainlessSteel', '#8b9498', { label: 'Stainless steel' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { anodizedAluminum: '#a8afb2', silicone: '#353c41', stainlessSteel: '#8b9498' },
  classroom: { anodizedAluminum: '#4a7892', silicone: '#d35d48', stainlessSteel: '#d3a546' },
});

const office = assembly('laptop-stand');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof anodizedAluminum | typeof silicone | typeof stainlessSteel) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === anodizedAluminum) office.part(name, partShape.color(anodizedAluminum));
  else if (colour === silicone) office.part(name, partShape.color(silicone));
  else office.part(name, partShape.color(stainlessSteel));
};

addBox('left-rail', -82, 0, 75, 18, 240, 12, anodizedAluminum);
addBox('right-rail', 82, 0, 75, 18, 240, 12, anodizedAluminum);
addBox('front-lip-left', -82, -112, 87, 18, 18, 18, stainlessSteel);
addBox('front-lip-right', 82, -112, 87, 18, 18, 18, stainlessSteel);
addBox('rear-foot', 0, 92, 0, 200, 20, 14, silicone);
addBox('front-foot', 0, -98, 0, 200, 20, 14, silicone);
addBox('crossbar', 0, 0, 75, 180, 14, 10, anodizedAluminum);

return office.model();
