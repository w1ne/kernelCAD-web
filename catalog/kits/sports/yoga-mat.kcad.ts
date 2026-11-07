// Yoga Mat: Rolled yoga mat prop with a flat practice surface and cylindrical roll. Low-poly sports prop in millimetres, Z up; materials: foam rubber mat, carry webbing, edge binding.
meta({
  name: 'yoga-mat',
  license: 'CC0-1.0',
  title: 'Yoga mat',
  description: "Rolled yoga mat prop with a flat practice surface and cylindrical roll. Material controls: foam rubber mat, carry webbing, edge binding.",
  tags: ['yoga mat', 'fitness', 'yoga', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const foamRubber = param('foamRubber', '#6b8978', { label: 'Foam rubber mat' });
const carryWebbing = param('carryWebbing', '#c2b49a', { label: 'Carry webbing' });
const edgeBinding = param('edgeBinding', '#3d534b', { label: 'Edge binding' });
presets({ clubColors: { foamRubber: '#587ca0', carryWebbing: '#d7c154' } });
const p = assembly('yoga-mat');
p.part('mat', box(300, 210, 8, true).translate(0, 0, 4).scale(scale).color(foamRubber));
p.part('rolled-edge', cylinder(210, 28, 12).rotate([1, 0, 0], 90).translate(0, 105, 28).scale(scale).color(edgeBinding));


// Webbing straps cross the rolled mat, with binding along the two long edges.
p.part("carry-strap-left", box(8, 205, 2, true).translate(-55, 0, 9).color(carryWebbing));
p.part("carry-strap-right", box(8, 205, 2, true).translate(55, 0, 9).color(carryWebbing));
p.part("edge-binding-front", box(296, 3, 1.5, true).translate(0, -102, 9).color(edgeBinding));
p.part("edge-binding-back", box(296, 3, 1.5, true).translate(0, 102, 9).color(edgeBinding));

return p.model();
