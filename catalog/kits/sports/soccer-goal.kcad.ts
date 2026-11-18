// Soccer Goal: Portable soccer goal with an aluminium frame and an open knotted-looking net grid across its roof, sides and floor. Low-poly sports prop in millimetres, Z up; materials: goal aluminium, net nylon, ground rubber.
meta({
  name: 'soccer-goal',
  license: 'CC0-1.0',
  title: 'Soccer goal',
  description: "Portable soccer goal with an aluminium frame and an open knotted-looking net grid across its roof, sides and floor. Material controls: goal aluminium, net nylon, ground rubber.",
  tags: ['soccer goal', 'football goal', 'net', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const goalAluminium = param('goalAluminium', '#dce2df', { label: 'Goal aluminium' });
const netNylon = param('netNylon', '#728078', { label: 'Net nylon' });
const groundRubber = param('groundRubber', '#343b3e', { label: 'Ground rubber' });
presets({ clubColors: { goalAluminium: '#dce2df', netNylon: '#e5e1d4' } });
const p = assembly('soccer-goal');
const add = (name, shape) => p.part(name, shape.scale(scale));
add('left-post', cylinder(210, 7, 10).translate(-145, 0, 0).color(goalAluminium));
add('right-post', cylinder(210, 7, 10).translate(145, 0, 0).color(goalAluminium));
add('crossbar', box(302, 14, 14, true).translate(0, 0, 210).color(goalAluminium));


// Open mesh cords replace the solid panels while preserving the goal's frame.
for (let i = 0; i <= 9; i++) {
  const y = 0 + i * 10;
  add(`roof-mesh-long-${i + 1}`, box(282, 2.4, 2.4, true).translate(0, y, 205).color(netNylon));
  add(`floor-mesh-long-${i + 1}`, box(282, 2.4, 2.4, true).translate(0, y, 4).color(netNylon));
}
for (let i = 0; i <= 14; i++) {
  const x = -140 + i * 20;
  add(`roof-mesh-cross-${i + 1}`, box(2.4, 90, 2.4, true).translate(x, 42, 205).color(netNylon));
  add(`floor-mesh-cross-${i + 1}`, box(2.4, 90, 2.4, true).translate(x, 42, 4).color(netNylon));
  add(`left-mesh-cross-${i + 1}`, box(2.4, 2.4, 205, true).translate(-140, -3 + i * 6, 105).color(netNylon));
  add(`right-mesh-cross-${i + 1}`, box(2.4, 2.4, 205, true).translate(140, -3 + i * 6, 105).color(netNylon));
}
for (let i = 0; i <= 5; i++) {
  const z = 20 + i * 36;
  add(`left-mesh-height-${i + 1}`, box(2.4, 90, 2.4, true).translate(-140, 42, z).color(netNylon));
  add(`right-mesh-height-${i + 1}`, box(2.4, 90, 2.4, true).translate(140, 42, z).color(netNylon));
}
add("left-ground-pad", box(42, 44, 10, true).translate(-145, 0, 5).color(groundRubber));
add("right-ground-pad", box(42, 44, 10, true).translate(145, 0, 5).color(groundRubber));

return p.model();
