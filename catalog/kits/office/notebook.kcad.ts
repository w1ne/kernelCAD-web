// Notebook: Pocket notebook with a solid cover, page block, spine and elastic closure. Material controls: page paper, cover leatherette, printed ink.

meta({
  name: 'notebook',
  license: 'CC0-1.0',
  title: 'Notebook',
  description: "Pocket notebook with a solid cover, page block, spine and elastic closure. Controls: page paper, cover leatherette, printed ink.",
  tags: ['notebook', 'journal', 'paper', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const paper = param('paper', '#eee9db', { label: 'Page paper' });
const leatherette = param('leatherette', '#385971', { label: 'Cover leatherette' });
const ink = param('ink', '#3d444b', { label: 'Printed ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { paper: '#eee9db', leatherette: '#385971', ink: '#3d444b' },
  classroom: { paper: '#f0df88', leatherette: '#a75145', ink: '#476d9a' },
});

const office = assembly('notebook');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof paper | typeof leatherette | typeof ink) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === paper) office.part(name, partShape.color(paper));
  else if (colour === leatherette) office.part(name, partShape.color(leatherette));
  else office.part(name, partShape.color(ink));
};

addBox('page-block', 0, 0, 0, 142, 205, 18, leatherette);
addBox('front-cover', 0, -5, 18, 150, 207, 7, paper);
addBox('back-cover', 0, 5, 18, 150, 207, 7, paper);
addBox('spine', -71, 0, 18, 9, 207, 8, ink);
addBox('elastic-band', 65, -4, 25, 6, 216, 3, ink);
addBox('title-panel', 0, 35, 26, 70, 70, 2, leatherette);

return office.model();
