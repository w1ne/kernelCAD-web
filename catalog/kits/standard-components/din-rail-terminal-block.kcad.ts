// Single-level DIN terminal block with top screw wells, exposed copper clamps, and an undercut clip foot.
meta({
  name: 'din-rail-terminal-block',
  license: 'CC0-1.0',
  title: 'DIN rail terminal block',
  description: 'Polymer DIN terminal block with paired screw wells, exposed copper clamp windows and an undercut steel clip foot. Knobs: model size, polymer, steel and copper.',
  tags: ['terminal block', 'din rail', 'electrical connector', 'cabinet'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#b9c4c9', { label: 'Steel' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
const copper = param('copper', '#d9a344', { label: 'Copper contacts' });
presets({
  dark: { steel: '#77858b', polymer: '#244956', copper: '#8a5331' },
  brass: { steel: '#aeb8bd', polymer: '#1d5364', copper: '#e0b356' },
  weathered: { steel: '#8e8578', polymer: '#96734f', copper: '#806747' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('din-rail-terminal-block');
let body = block(-14 * s, -12 * s, 6 * s, 28 * s, 24 * s, 27 * s);
for (const x of [-7, 7]) {
  body = body.subtract(cylinder(11 * s, 2.8 * s, 12).translate(x * s, 0, 23 * s));
  // Recessed side windows expose the separate metal clamping cages.
  body = body.subtract(block((x - 4) * s, -13 * s, 14 * s, 8 * s, 10 * s, 9 * s));
  body = body.subtract(block((x - 4) * s, 3 * s, 14 * s, 8 * s, 10 * s, 9 * s));
}
a.part('polymer-housing', body.color(polymer));

for (const x of [-7, 7]) {
  a.part(`copper-clamp-${x < 0 ? 'left' : 'right'}`,
    block((x - 3.8) * s, -11.4 * s, 15 * s, 7.6 * s, 22.8 * s, 7 * s).color(copper));
  const shank = cylinder(10 * s, 1.35 * s, 10).translate(x * s, 0, 21 * s);
  const head = cylinder(2 * s, 2.55 * s, 10).translate(x * s, 0, 31 * s)
    .subtract(box(3.2 * s, 0.8 * s, 0.8 * s, true).translate(x * s, 0, 32.7 * s));
  a.part(`steel-clamp-screw-shank-${x < 0 ? 'left' : 'right'}`, shank.color(steel));
  a.part(`steel-clamp-screw-head-${x < 0 ? 'left' : 'right'}`, head.color(steel));
}

const foot = block(-11 * s, -10 * s, 0, 22 * s, 20 * s, 6 * s)
  .subtract(block(-12 * s, -5 * s, -s, 24 * s, 10 * s, 4.5 * s));
a.part('formed-steel-clip-foot', foot.color(steel));
// This spring bridge spans the undercut and keys the housing onto the top-hat rail.
a.part('retaining-spring', block(-6 * s, -5.5 * s, 2 * s, 12 * s, 11 * s, 1.5 * s).color(steel));
return a.model();
