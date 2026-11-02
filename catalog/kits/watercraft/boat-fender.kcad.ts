// Original kernelCAD ribbed cylindrical dock fender with end loops.

meta({
  name: 'boat-fender', license: 'CC0-1.0', title: 'Boat fender',
  description: 'Ribbed cylindrical boat fender with rounded ends and attachment loops at both ends. Knobs: length, body and cap colors.',
  tags: ['boat fender', 'dock bumper', 'mooring', 'marine', 'watercraft', 'harbor'], kit: 'watercraft', category: 'prop', origin: 'base',
  compat: ['dock', 'harbor', 'coastal', 'boat'], triangleBudget: 700,
});

const length = param('length', '480', { choices: ['360', '480', '600'], label: 'Fender length (mm)' });
const body = param('body', '#d8d6c8', { label: 'Fender body' });
const caps = param('caps', '#364c5b', { label: 'End caps and loops' });
presets({ harbor: { body: '#d8d6c8', caps: '#364c5b' }, safety: { body: '#e9c446', caps: '#222d32' } });

const L = Number(length.value);
const fender = assembly('boat-fender');
fender.part('main-body', cylinder(L, 92, 12).translate(0, 0, 0).color(body));
for (const [index, z] of [L * 0.18, L * 0.42, L * 0.66, L * 0.9].entries()) {
  fender.part('rib-' + (index + 1), cylinder(18, 101, 12).subtract(cylinder(20, 90, 12).translate(0, 0, -1)).translate(0, 0, z).color(caps));
}
fender.part('upper-loop', cylinder(20, 45, 8).subtract(cylinder(22, 28, 8).translate(0, 0, -1)).translate(0, 0, L - 8).color(caps));
fender.part('lower-loop', cylinder(20, 45, 8).subtract(cylinder(22, 28, 8).translate(0, 0, -1)).translate(0, 0, 0).color(caps));
return fender.model();
