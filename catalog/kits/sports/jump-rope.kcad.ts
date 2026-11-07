// Jump Rope: Jump rope prop with a low-poly loop and two upright grip handles. Low-poly sports prop in millimetres, Z up; materials: braided nylon rope, handle polymer, grip foam.
meta({
  name: 'jump-rope',
  license: 'CC0-1.0',
  title: 'Jump rope',
  description: "Jump rope prop with a low-poly loop and two upright grip handles. Material controls: braided nylon rope, handle polymer, grip foam.",
  tags: ['jump rope', 'skipping rope', 'training', 'gym', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const braidedNylon = param('braidedNylon', '#bd5c4b', { label: 'Braided nylon rope' });
const handlePolymer = param('handlePolymer', '#4d5557', { label: 'Handle polymer' });
const gripFoam = param('gripFoam', '#d5c7a9', { label: 'Grip foam' });
presets({ clubColors: { braidedNylon: '#3875a0', handlePolymer: '#4d5557' } });
const p = assembly('jump-rope');
p.part('rope-loop', cylinder(5, 168, 20).subtract(cylinder(7, 158, 20).translate(0, 0, -1)).scale(scale).color(braidedNylon));
p.part('left-handle', cylinder(94, 9, 10).translate(-166, 0, 0).scale(scale).color(handlePolymer));
p.part('right-handle', cylinder(94, 9, 10).translate(166, 0, 0).scale(scale).color(handlePolymer));
p.part('left-grip', cylinder(50, 13, 10).translate(-166, 0, 20).scale(scale).color(gripFoam));
p.part('right-grip', cylinder(50, 13, 10).translate(166, 0, 20).scale(scale).color(gripFoam));

return p.model();
