// Original kernelCAD low-poly anchor with stockless and fluke variants.

meta({
  name: 'anchor', license: 'CC0-1.0', title: 'Boat anchor',
  description: 'Compact marine anchor with a shank, crown, flukes and lifting ring in stockless or broad-fluke form. Knobs: style, size and metal colour.',
  tags: ['anchor', 'boat', 'marine', 'mooring', 'watercraft', 'harbor'], kit: 'watercraft', category: 'prop', origin: 'base',
  compat: ['water', 'harbor', 'coastal', 'boat'], triangleBudget: 220,
});

const style = param('style', 'fluke', { choices: ['fluke', 'stockless'], label: 'Anchor style' });
const size = param('size', '600', { choices: ['450', '600', '750'], label: 'Shank length (mm)' });
const metal = param('metal', '#777e7c', { label: 'Galvanized steel' });
presets({ stainless: { metal: '#c6cbc8' }, aged: { metal: '#696c64' } });

const L = Number(size.value);
const anchor = assembly('anchor');
anchor.part('shank', cylinder(L * 0.72, 24, 8).translate(0, 0, 55).color(metal));
anchor.part('lifting-eye', cylinder(42, 76, 10).subtract(cylinder(44, 47, 10).translate(0, 0, -1)).color(metal));
anchor.part('crown', box(64, 190, 52, true).translate(0, 0, 60).color(metal));
anchor.part('crossbar', box(42, L * 0.64, 42, true).translate(0, 0, L * 0.7).color(metal));
if (style.value === 'fluke') {
  anchor.part('left-fluke', box(70, L * 0.34, 44, true).rotateZ(-24).translate(-L * 0.2, 0, 35).color(metal));
  anchor.part('right-fluke', box(70, L * 0.34, 44, true).rotateZ(24).translate(L * 0.2, 0, 35).color(metal));
} else {
  anchor.part('left-arm', box(44, L * 0.4, 45, true).rotateZ(-38).translate(-L * 0.25, 0, 45).color(metal));
  anchor.part('right-arm', box(44, L * 0.4, 45, true).rotateZ(38).translate(L * 0.25, 0, 45).color(metal));
}
return anchor.model();
