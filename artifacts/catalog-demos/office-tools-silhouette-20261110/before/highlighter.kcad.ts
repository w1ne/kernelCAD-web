// Highlighter: Broad chisel-tip highlighter with a removable cap and contrasting end plug. Material controls: barrel polymer, fluorescent ink, felt tip.

meta({
  name: 'highlighter',
  license: 'CC0-1.0',
  title: 'Highlighter',
  description: "Broad chisel-tip highlighter with a removable cap and contrasting end plug. Controls: barrel polymer, fluorescent ink, felt tip.",
  tags: ['highlighter', 'marker pen', 'office', 'stationery', 'writing tool'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const polymer = param('polymer', '#eac633', { label: 'Barrel polymer' });
const fluorescentInk = param('fluorescentInk', '#f4ed48', { label: 'Fluorescent ink' });
const felt = param('felt', '#c84747', { label: 'Felt tip' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#eac633', fluorescentInk: '#f4ed48', felt: '#c84747' },
  classroom: { polymer: '#57a16a', fluorescentInk: '#ff8d49', felt: '#3c6da3' },
});

const office = assembly('highlighter');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof polymer | typeof fluorescentInk | typeof felt) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === polymer) office.part(name, partShape.color(polymer));
  else if (colour === fluorescentInk) office.part(name, partShape.color(fluorescentInk));
  else office.part(name, partShape.color(felt));
};

addBox('barrel', 0, 0, 0, 112, 24, 22, polymer);
addBox('cap', -48, 0, 2, 28, 28, 26, fluorescentInk);
addBox('cap-clip', -38, 16, 17, 45, 4, 5, fluorescentInk);
addBox('chisel-tip', 55, 0, 4, 12, 18, 12, felt);
addBox('end-plug', -61, 0, 4, 8, 18, 14, felt);

return office.model();
