// Letter sorter: Upright desktop sorter with two or three stepped compartments for incoming papers. Material controls: timber, letter paper, powder-coated steel.

meta({
  name: 'letter-sorter',
  license: 'CC0-1.0',
  title: 'Letter sorter',
  description: "Upright desktop sorter with two or three stepped compartments for incoming papers. Controls: timber, letter paper, powder-coated steel.",
  tags: ['letter sorter', 'paper organizer', 'document organizer', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 260,
});

const timber = param('timber', '#aa7d4f', { label: 'Timber' });
const paper = param('paper', '#f0e6d1', { label: 'Letter paper' });
const powderCoatedSteel = param('powderCoatedSteel', '#3f5967', { label: 'Powder-coated steel' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { timber: '#aa7d4f', paper: '#f0e6d1', powderCoatedSteel: '#3f5967' },
  classroom: { timber: '#4b7784', paper: '#e4cf72', powderCoatedSteel: '#d3664c' },
});

const shelves = param('shelves', '3', { choices: ['2', '3'], label: 'Compartments' });
const shelfCount = Number(shelves.value);

const office = assembly('letter-sorter');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof timber | typeof paper | typeof powderCoatedSteel) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === timber) office.part(name, partShape.color(timber));
  else if (colour === paper) office.part(name, partShape.color(paper));
  else office.part(name, partShape.color(powderCoatedSteel));
};

addBox('base', 0, 0, 0, 230, 120, 12, timber);
for (let i = 0; i < shelfCount; i++) {
  const y = -38 + i * 34;
  const z = 24 + i * 37;
  addBox(`divider-${i + 1}`, 0, y, z, 210, 12, 76, paper);
  addBox(`floor-${i + 1}`, 0, y - 15, z - 8, 210, 48, 8, timber);
}
addBox('back-panel', 0, 52, 22, 230, 12, 150, powderCoatedSteel);

return office.model();
