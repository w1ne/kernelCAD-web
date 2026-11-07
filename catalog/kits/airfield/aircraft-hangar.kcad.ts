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
p.part("left-wall", box(24, 540, 300, true).translate(-330, 0, 150).scale(scale).color(cladding));
p.part("right-wall", box(24, 540, 300, true).translate(330, 0, 150).scale(scale).color(cladding));
p.part("rear-wall", box(660, 24, 300, true).translate(0, 258, 150).scale(scale).color(concrete));
p.part("roof", path().moveTo(-350, 300).lineTo(0, 392).lineTo(350, 300).lineTo(350, 282).lineTo(-350, 282).close().extrude(600).rotateX(90).translate(0, 300, 0).scale(scale).color(roofMetal));
p.part("ridge", box(24, 600, 20, true).translate(0, 0, 397).scale(scale).color(roofMetal));
p.part("door-header", box(510, 28, 36, true).translate(0, -274, 282).scale(scale).color(roofMetal));

return p.model();
