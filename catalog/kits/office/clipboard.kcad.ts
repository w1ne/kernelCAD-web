// Clipboard: Portable writing board with paper stack, broad top clip and a hanging hole marker. Material controls: polypropylene, paper, stainless steel.

meta({
  name: 'clipboard',
  license: 'CC0-1.0',
  title: 'Clipboard',
  description: "Portable writing board with paper stack, broad top clip and a hanging hole marker. Controls: polypropylene, paper, stainless steel.",
  tags: ['clipboard', 'writing board', 'paperwork', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 160,
});

const polypropylene = param('polypropylene', '#476b7e', { label: 'Polypropylene' });
const paper = param('paper', '#f2efe6', { label: 'Paper' });
const stainlessSteel = param('stainlessSteel', '#b5bdc1', { label: 'Stainless steel' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polypropylene: '#476b7e', paper: '#f2efe6', stainlessSteel: '#b5bdc1' },
  classroom: { polypropylene: '#e06b4f', paper: '#f1df8e', stainlessSteel: '#577189' },
});

const office = assembly('clipboard');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polypropylene | typeof paper | typeof stainlessSteel) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polypropylene) office.part(name, partShape.color(polypropylene));
  else if (colour === paper) office.part(name, partShape.color(paper));
  else office.part(name, partShape.color(stainlessSteel));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof polypropylene | typeof paper | typeof stainlessSteel) => {
  const partShape = cylinder(h * k, r * k).translate(x * k, y * k, z * k);
  if (colour === polypropylene) office.part(name, partShape.color(polypropylene));
  else if (colour === paper) office.part(name, partShape.color(paper));
  else office.part(name, partShape.color(stainlessSteel));
};

addBox('board', 0, 0, 0, 225, 315, 10, polypropylene);
addBox('paper', 0, -7, 10, 200, 270, 4, paper);
addBox('clip-plate', 0, 143, 14, 76, 26, 7, stainlessSteel);
addBox('clip-lip', 0, 131, 14, 38, 7, 7, stainlessSteel);
addCylinder('hanging-eyelet', 8, 8, 0, 143, 22, stainlessSteel);

return office.model();
