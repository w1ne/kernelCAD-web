// Original low-poly trail map case, shown folded or opened over its map.
// Millimetres, Z up, base at z = 0.

meta({
  name: 'map-case',
  license: 'CC0-1.0',
  title: 'Trail map case',
  description: 'Water-resistant map pouch with a clear map panel, fold lines and securing straps. Knobs: open or folded state, pouch, map and strap colours.',
  tags: ['map case', 'map pouch', 'navigation', 'camping', 'hiking', 'trail'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 260,
});

const state = param('state', 'open', { choices: ['open', 'folded'], label: 'Case state' });
const pouch = param('pouch', '#69543e', { label: 'Pouch' });
const map = param('map', '#e2d8b7', { label: 'Map panel' });
const strap = param('strap', '#3d4341', { label: 'Strap' });

const open = state.value === 'open';
const mapWidth = open ? 520 : 340;
const mapDepth = open ? 370 : 250;
const caseModel = assembly('map-case');
caseModel.part('pouch-base', box(360, 285, 44, true).translate(0, 0, 32).color(pouch));
caseModel.part('map-panel', box(mapWidth, mapDepth, 8, true).translate(0, 12, 60).color(map));
caseModel.part('case-flap', box(360, 76, 18, true).translate(0, -177, 62).color(pouch));
caseModel.part('left-case-strap', box(24, mapDepth - 14, 18, true).translate(-118, 12, 68).color(strap));
caseModel.part('right-case-strap', box(24, mapDepth - 14, 18, true).translate(118, 12, 68).color(strap));
caseModel.part('strap-adjuster', box(44, 42, 14, true).translate(118, -86, 82).color(pouch));
for (let i = 0; i < 4; i++) {
  caseModel.part('map-grid-' + (i + 1), box(6, mapDepth - 42, 4, true)
    .translate(-mapWidth / 2 + 64 + i * (mapWidth - 128) / 3, 12, 66)
    .color(pouch));
}
caseModel.part('map-fold', box(mapWidth - 40, 5, 4, true).translate(0, 12, 66).color(pouch));

return caseModel.model();
