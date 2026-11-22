// Sticky notes: Square adhesive-note pad with layered paper edges and a lifted corner marker. Material controls: sticky-note paper, adhesive strip, printed ink.

meta({
  name: 'sticky-notes',
  license: 'CC0-1.0',
  title: 'Sticky notes',
  description: "Square adhesive-note pad with layered paper edges and a lifted corner marker. Controls: sticky-note paper, adhesive strip, printed ink.",
  tags: ['sticky notes', 'sticky note pad', 'memo', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 110,
});

const paper = param('paper', '#e2e559', { label: 'Sticky-note paper' });
const adhesive = param('adhesive', '#e9dfc1', { label: 'Adhesive strip' });
const ink = param('ink', '#475a6a', { label: 'Printed ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { paper: '#e2e559', adhesive: '#e9dfc1', ink: '#475a6a' },
  classroom: { paper: '#e9a94f', adhesive: '#92a56a', ink: '#4e7191' },
});

const sheets = param('sheets', '100', { choices: ['50', '100', '200'], label: 'Sheet count' });
const sheetHeight = Number(sheets.value) / 14;

const office = assembly('sticky-notes');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof paper | typeof adhesive | typeof ink) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === paper) office.part(name, partShape.color(paper));
  else if (colour === adhesive) office.part(name, partShape.color(adhesive));
  else office.part(name, partShape.color(ink));
};

addBox('backing', 0, 0, 0, 78, 78, 5, ink);
addBox('paper-stack', 0, 0, 5, 74, 74, sheetHeight, paper);
addBox('lifted-corner', 22, 21, 5 + sheetHeight, 25, 25, 2, adhesive);

return office.model();
