// Hanging file folder: Hanging document folder with a broad tab and two end rails for a filing drawer. Material controls: file card, hanging rail steel, folder paper.

meta({
  name: 'hanging-file-folder',
  license: 'CC0-1.0',
  title: 'Hanging file folder',
  description: "Hanging document folder with a broad tab and two end rails for a filing drawer. Controls: file card, hanging rail steel, folder paper.",
  tags: ['hanging folder', 'hanging file', 'file folder', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const fileCard = param('fileCard', '#88a76a', { label: 'File card' });
const steel = param('steel', '#aeb8bb', { label: 'Hanging rail steel' });
const paper = param('paper', '#f0e8d7', { label: 'Folder paper' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { fileCard: '#88a76a', steel: '#aeb8bb', paper: '#f0e8d7' },
  classroom: { fileCard: '#e0a04d', steel: '#506c83', paper: '#ece076' },
});

const office = assembly('hanging-file-folder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof fileCard | typeof steel | typeof paper) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === fileCard) office.part(name, partShape.color(fileCard));
  else if (colour === steel) office.part(name, partShape.color(steel));
  else office.part(name, partShape.color(paper));
};

addBox('folder-fileCard', 0, 0, 0, 250, 330, 8, fileCard);
addBox('paper-stack', 0, 15, 8, 228, 275, 12, steel);
addBox('tab', 82, 151, 8, 76, 28, 8, fileCard);
addBox('left-hanger', -117, 0, 4, 9, 350, 8, paper);
addBox('right-hanger', 117, 0, 4, 9, 350, 8, paper);
addBox('tab-label', 82, 149, 16, 42, 3, 12, steel);

return office.model();
