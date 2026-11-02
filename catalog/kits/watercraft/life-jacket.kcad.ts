// Original kernelCAD personal flotation vest with adjustable waist straps.

meta({
  name: 'life-jacket', license: 'CC0-1.0', title: 'Life jacket',
  description: 'Personal flotation vest with shoulder panels, raised collar and two adjustable waist straps. Knobs: size, shell and trim colours.',
  tags: ['life jacket', 'PFD', 'personal flotation', 'safety', 'marine', 'watercraft'], kit: 'watercraft', category: 'prop', origin: 'base',
  compat: ['water', 'harbor', 'coastal', 'safety', 'outdoor'], triangleBudget: 220,
});

const size = param('size', 'adult', { choices: ['child', 'adult'], label: 'Vest size' });
const shell = param('shell', '#e46735', { label: 'Flotation shell' });
const trim = param('trim', '#f1d15f', { label: 'Reflective trim' });
presets({ rescue: { shell: '#e46735', trim: '#f1d15f' }, navy: { shell: '#294c65', trim: '#e9ded0' } });

const s = size.value === 'child' ? 0.76 : 1;
const jacket = assembly('life-jacket');
jacket.part('front-panel', box(360 * s, 110, 350 * s, true).translate(0, 0, 175 * s).color(shell));
jacket.part('left-shoulder', box(112 * s, 130, 150 * s, true).rotateY(-18).translate(-108 * s, 0, 375 * s).color(shell));
jacket.part('right-shoulder', box(112 * s, 130, 150 * s, true).rotateY(18).translate(108 * s, 0, 375 * s).color(shell));
jacket.part('collar', box(182 * s, 140, 72 * s, true).translate(0, 20, 390 * s).color(trim));
for (const [index, z] of [115, 260].entries()) {
  jacket.part('waist-strap-' + (index + 1), box(375 * s, 28, 36, true).translate(0, -62, z * s).color(trim));
  jacket.part('buckle-' + (index + 1), box(54, 34, 44, true).translate(0, -80, z * s).color(shell));
}
jacket.part('grab-loop', box(70 * s, 30, 58 * s, true).translate(0, 0, 430 * s).color(trim));
return jacket.model();
