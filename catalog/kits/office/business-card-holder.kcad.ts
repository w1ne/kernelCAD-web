// Business card holder: Angled desktop business-card holder with a visible card stack and front stop. Material controls: anodized aluminum, card stock, rubber feet.

meta({
  name: 'business-card-holder',
  license: 'CC0-1.0',
  title: 'Business card holder',
  description: "Angled desktop business-card holder with a visible card stack and front stop. Controls: anodized aluminum, card stock, rubber feet.",
  tags: ['business card holder', 'card holder', 'office', 'stationery', 'desk accessory'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 130,
});

const anodizedAluminum = param('anodizedAluminum', '#a6afb2', { label: 'Anodized aluminum' });
const cardStock = param('cardStock', '#f1ece1', { label: 'Card stock' });
const rubber = param('rubber', '#343c40', { label: 'Rubber feet' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { anodizedAluminum: '#a6afb2', cardStock: '#f1ece1', rubber: '#343c40' },
  classroom: { anodizedAluminum: '#446c8c', cardStock: '#f4c66b', rubber: '#c6564d' },
});

const office = assembly('business-card-holder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof anodizedAluminum | typeof cardStock | typeof rubber) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === anodizedAluminum) office.part(name, partShape.color(anodizedAluminum));
  else if (colour === cardStock) office.part(name, partShape.color(cardStock));
  else office.part(name, partShape.color(rubber));
};

addBox('base', 0, 0, 0, 125, 85, 8, anodizedAluminum);
addBox('back-rest', 0, 31, 8, 125, 12, 75, anodizedAluminum);
addBox('card-stack', 0, 5, 13, 104, 55, 16, cardStock);
addBox('front-stop', 0, -35, 8, 125, 10, 28, anodizedAluminum);
addBox('front-mark', 0, -41, 16, 58, 3, 8, rubber);

return office.model();
