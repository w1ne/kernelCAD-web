// Aircraft hangar: Open-front apron hangar with side and rear walls, a pitched gable roof, ridge cap and a clear aircraft-door opening. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'aircraft-hangar',
  license: 'CC0-1.0',
  title: 'Aircraft hangar',
  description: 'Open-front apron hangar with side and rear walls, a pitched gable roof, ridge cap and a clear aircraft-door opening. Material controls: metal cladding, roof metal, concrete. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const cladding = param('cladding', '#f0ead8', { label: 'Metal cladding' });
const roofMetal = param('roofMetal', '#39799c', { label: 'Roof metal' });
const concrete = param('concrete', '#bcb8ad', { label: 'Concrete' });

presets({
  weathered: {
    cladding: '#596765',
    roofMetal: '#536267',
    concrete: '#555751',
  },
  highVisibility: {
    cladding: '#f0b52f',
    roofMetal: '#aeb9bb',
    concrete: '#999990',
  },
});
const p = assembly("aircraft-hangar");
// Generic 22 m apron hangar: unobstructed front opening and pitched roof.
p.part("left-wall", box(220, 18000, 7000, true).translate(-10900, 0, 3500).scale(scale).color(cladding));
p.part("right-wall", box(220, 18000, 7000, true).translate(10900, 0, 3500).scale(scale).color(cladding));
p.part("rear-wall", box(22000, 220, 7000, true).translate(0, 8900, 3500).scale(scale).color(cladding));
p.part("rear-gable", path().moveTo(-11000, 7000).lineTo(0, 10000).lineTo(11000, 7000).close().extrude(220).rotateX(90).translate(0, 9010, 0).scale(scale).color(cladding));
p.part("left-roof", box(11600, 18800, 220, true).rotate([0, 1, 0], -15.255).translate(-5500, 0, 8500).scale(scale).color(roofMetal));
p.part("right-roof", box(11600, 18800, 220, true).rotate([0, 1, 0], 15.255).translate(5500, 0, 8500).scale(scale).color(roofMetal));
p.part("ridge", box(400, 18800, 220, true).translate(0, 0, 10070).scale(scale).color(roofMetal));
p.part("door-header", box(21600, 420, 600, true).translate(0, -8790, 6750).scale(scale).color(roofMetal));
for (const side of [-1, 1]) {
  for (const y of [-8800, -4400, 0, 4400, 8800]) {
    p.part("column-" + side + "-" + y, box(400, 360, 7000, true).translate(side * 10650, y, 3500).scale(scale).color(concrete));
  }
  for (const y of [-6750, -2250, 2250, 6750]) {
    p.part("wall-seam-" + side + "-" + y, box(90, 100, 7000, true).translate(side * 11015, y, 3500).scale(scale).color(roofMetal));
  }
}
for (const y of [-8800, -4400, 0, 4400, 8800]) {
  p.part("left-rafter-" + y, box(11400, 230, 250, true).rotate([0, 1, 0], -15.255).translate(-5500, y, 8320).scale(scale).color(concrete));
  p.part("right-rafter-" + y, box(11400, 230, 250, true).rotate([0, 1, 0], 15.255).translate(5500, y, 8320).scale(scale).color(concrete));
}
return p.model();
