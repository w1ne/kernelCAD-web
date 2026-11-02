// Original kernelCAD twin-horn mooring cleat with a bolted mounting plate.

meta({
  name: 'dock-cleat', license: 'CC0-1.0', title: 'Dock mooring cleat',
  description: 'Compact twin-horn mooring cleat with a flat mounting plate and two raised horns. Knobs: size and body color.',
  tags: ['dock cleat', 'mooring', 'cleat', 'harbor', 'watercraft', 'marine'], kit: 'watercraft', category: 'prop', origin: 'base',
  compat: ['dock', 'harbor', 'coastal', 'boat'], triangleBudget: 260,
});

const size = param('size', '180', { choices: ['140', '180', '220'], label: 'Cleat length (mm)' });
const body = param('body', '#b7bdb8', { label: 'Cast metal' });
presets({ stainless: { body: '#cbd0cc' }, bronze: { body: '#9a6d48' } });

const L = Number(size.value);
const cleat = assembly('dock-cleat');
cleat.part('base-plate', box(L, 88, 26, true).translate(0, 0, 13).color(body));
for (const [index, x] of [-L * 0.27, L * 0.27].entries()) {
  cleat.part('horn-' + (index + 1), cylinder(76, 20, 8).translate(x, 0, 26).color(body));
  cleat.part('horn-tip-' + (index + 1), box(40, 38, 26, true).rotateZ(index === 0 ? -20 : 20).translate(x + (index === 0 ? -14 : 14), 0, 91).color(body));
}
for (const x of [-L * 0.38, L * 0.38]) {
  cleat.part('bolt-' + (x < 0 ? 'left' : 'right'), cylinder(8, 9, 8).translate(x, 0, 26).color(body));
}
return cleat.model();
