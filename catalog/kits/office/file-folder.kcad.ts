// File folder: Folded desktop file folder with a raised tab and visible paper edge. Material controls: manila card, paper, steel wire.

meta({
  name: 'file-folder',
  license: 'CC0-1.0',
  title: 'File folder',
  description: "Folded desktop file folder with a raised tab and visible paper edge. Controls: manila card, paper, steel wire.",
  tags: ['file folder', 'folder', 'document', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 140,
});

const manilaCard = param('manilaCard', '#c8a85a', { label: 'Manila card' });
const paper = param('paper', '#eee9db', { label: 'Paper' });
const steelWire = param('steelWire', '#aab1b3', { label: 'Steel wire' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { manilaCard: '#c8a85a', paper: '#eee9db', steelWire: '#aab1b3' },
  classroom: { manilaCard: '#709c70', paper: '#f0df8c', steelWire: '#526f8a' },
});

const office = assembly('file-folder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof manilaCard | typeof paper | typeof steelWire) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === manilaCard) office.part(name, partShape.color(manilaCard));
  else if (colour === paper) office.part(name, partShape.color(paper));
  else office.part(name, partShape.color(steelWire));
};

addBox('folder-back', 0, 0, 0, 235, 315, 8, manilaCard);
addBox('folder-front', 0, -12, 8, 235, 290, 5, manilaCard);
addBox('paper-edge', 0, 5, 13, 218, 270, 5, paper);
addBox('raised-tab', 66, 145, 8, 72, 28, 7, manilaCard);
addBox('tab-label', 66, 144, 15, 42, 3, 12, steelWire);

return office.model();
