// Sports Water Bottle: Reusable sports bottle with a brushed steel body, polymer cap and contrasting silicone grip band. Low-poly sports prop in millimetres, Z up; materials: bottle stainless steel, cap polymer, silicone grip band.
meta({
  name: 'sports-water-bottle',
  license: 'CC0-1.0',
  title: 'Sports water bottle',
  description: "Reusable sports bottle with a brushed steel body, polymer cap and contrasting silicone grip band. Material controls: bottle stainless steel, cap polymer, silicone grip band.",
  tags: ['sports bottle', 'water bottle', 'fitness', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#8fa1a6', { label: 'Bottle stainless steel' });
const capPolymer = param('capPolymer', '#30393c', { label: 'Cap polymer' });
const siliconeGrip = param('siliconeGrip', '#d34c3d', { label: 'Silicone grip band' });
presets({ clubColors: { stainlessSteel: '#3f8191', capPolymer: '#30393c' } });
const p = assembly('sports-water-bottle');
p.part('body', cylinder(158, 38, 12).scale(scale).color(stainlessSteel));
p.part('shoulder', sphere(38).scale([1, 1, 0.52]).translate(0, 0, 150).scale(scale).color(stainlessSteel));
p.part('neck', cylinder(28, 21, 10).translate(0, 0, 164).scale(scale).color(stainlessSteel));
p.part('cap', cylinder(18, 24, 10).translate(0, 0, 190).scale(scale).color(capPolymer));


// A soft silicone ring adds grip to the lower half of the steel bottle.
p.part("silicone-grip-band", cylinder(10, 40, 12).subtract(cylinder(12, 37, 12).translate(0, 0, -1)).translate(0, 0, 105).color(siliconeGrip));

return p.model();
