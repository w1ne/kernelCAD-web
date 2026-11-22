// Stack of three hard-sided passenger suitcases with handles, corner bumpers and rolling wheels.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "luggage-stack",
  license: 'CC0-1.0',
  title: "Station luggage stack",
  description: "Stack of three hard-sided passenger suitcases with handles, corner bumpers and rolling wheels. Editable material controls: luggage polymer shell, leather, rubber. Includes weathered and fresh service presets.",
  tags: ["luggage stack", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymerShell = param('polymerShell', '#527b91', { label: 'Luggage polymer shell' });
const leather = param('leather', '#6d4a34', { label: 'Leather' });
const rubber = param('rubber', '#30363a', { label: 'Rubber' });
presets({
  weathered: { polymerShell: '#5a7682', leather: '#6e523e', rubber: '#414342' },
  freshService: { polymerShell: '#4388a5', leather: '#795239', rubber: '#272e32' },
});
const p = assembly("luggage-stack");
p.part("case-bottom", box(390,250,230,true).translate(0,0,132).scale(scale).translate(0, 0, -4).color(polymerShell));
p.part("case-middle", box(340,220,210,true).translate(20,0,350).scale(scale).translate(0, 0, -4).color(polymerShell));
p.part("case-top", box(270,190,170,true).translate(-10,0,540).scale(scale).translate(0, 0, -4).color(polymerShell));
p.part("handle-bottom", box(110,24,24,true).translate(0,0,252).scale(scale).translate(0, 0, -4).color(leather));
p.part("handle-middle", box(100,24,22,true).translate(20,0,465).scale(scale).translate(0, 0, -4).color(leather));
p.part("handle-top", box(90,22,20,true).translate(-10,0,630).scale(scale).translate(0, 0, -4).color(leather));
p.part("wheel-left", cylinder(28,28,8).translate(-160,-130,4).scale(scale).translate(0, 0, -4).color(rubber));
p.part("wheel-right", cylinder(28,28,8).translate(160,-130,4).scale(scale).translate(0, 0, -4).color(rubber));

return p.model();
