// Memo pad: Tear-off memo pad with a coloured backing and a selectable sheet count. Material controls: memo paper, chipboard backing, printed ink.

meta({
  name: 'memo-pad',
  license: 'CC0-1.0',
  title: 'Memo pad',
  description: "Tear-off memo pad with a coloured backing and a selectable sheet count. Controls: memo paper, chipboard backing, printed ink.",
  tags: ['memo pad', 'notepad', 'notes', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 100,
});

const paper = param('paper', '#f3eee1', { label: 'Memo paper' });
const chipboard = param('chipboard', '#b78a52', { label: 'Chipboard backing' });
const ink = param('ink', '#3e627e', { label: 'Printed ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { paper: '#f3eee1', chipboard: '#b78a52', ink: '#3e627e' },
  classroom: { paper: '#f0df7a', chipboard: '#49798a', ink: '#cb5a47' },
});

const sheets = param('sheets', '40', { choices: ['20', '40', '60'], label: 'Sheet count' });
const sheetHeight = Number(sheets.value) / 8;

const office = assembly('memo-pad');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof paper | typeof chipboard | typeof ink) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === paper) office.part(name, partShape.color(paper));
  else if (colour === chipboard) office.part(name, partShape.color(chipboard));
  else office.part(name, partShape.color(ink));
};

addBox('backing', 0, 0, 0, 115, 145, 7, chipboard);
addBox('paper-stack', 0, 0, 7, 108, 138, sheetHeight, paper);
addBox('top-glue-strip', 0, 66, 7 + sheetHeight, 108, 6, 4, ink);
addBox('page-corner', 43, 49, 7 + sheetHeight, 14, 13, 2, chipboard);

return office.model();
