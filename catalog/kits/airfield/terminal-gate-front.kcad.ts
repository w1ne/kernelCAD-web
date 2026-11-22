// Terminal gate front: Terminal gate facade with two concrete piers, a glazed passenger opening, projecting canopy and apron slab. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'terminal-gate-front',
  license: 'CC0-1.0',
  title: 'Terminal gate front',
  description: 'Terminal gate facade with two concrete piers, a glazed passenger opening, projecting canopy and apron slab. Material controls: roof metal, concrete, glazing. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const roofMetal = param('roofMetal', '#356d8f', { label: 'Roof metal' });
const concrete = param('concrete', '#b6aa96', { label: 'Concrete' });
const glass = param('glass', '#3db4c2', { label: 'Glazing' });

presets({
  weathered: {
    roofMetal: '#536267',
    concrete: '#555751',
    glass: '#315c69',
  },
  highVisibility: {
    roofMetal: '#aeb9bb',
    concrete: '#999990',
    glass: '#82c8d0',
  },
});
const p = assembly("terminal-gate-front");
p.part("left-pier", box(76, 74, 280, true).translate(-260, 0, 140).scale(scale).color(concrete));
p.part("right-pier", box(76, 74, 280, true).translate(260, 0, 140).scale(scale).color(concrete));
p.part("gate-canopy", box(620, 120, 48, true).translate(0, 0, 304).scale(scale).color(concrete));
p.part("concourse-roof", box(680, 260, 38, true).translate(0, -45, 332).scale(scale).color(roofMetal));
p.part("gate-apron", box(500, 150, 18, true).translate(0, 80, 10).scale(scale).color(concrete));

p.part("gate-glazing-front", box(610, 8, 98, true).translate(0, -43, 221).scale(scale).color(glass));
p.part("gate-glazing-back", box(610, 8, 98, true).translate(0, 43, 221).scale(scale).color(glass));

return p.model();
