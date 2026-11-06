// Kettlebell: Low-poly kettlebell with a rounded body and raised ring handle. Low-poly sports prop in millimetres, Z up; materials: cast iron body, handle steel.
meta({
  name: 'kettlebell',
  license: 'CC0-1.0',
  title: 'Kettlebell',
  description: "Low-poly kettlebell with a rounded body and raised ring handle. Material controls: cast iron body, handle steel.",
  tags: ['kettlebell', 'free weights', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const castIron = param('castIron', '#555e63', { label: 'Cast iron body' });
const handleSteel = param('handleSteel', '#aab4b7', { label: 'Handle steel' });
presets({ clubColors: { castIron: '#3f687f', handleSteel: '#aab4b7' } });
const p = assembly('kettlebell');
p.part('body', sphere(48).scale([1, 1, 0.92]).translate(0, 0, 44.16).scale(scale).color(castIron));
p.part('handle', cylinder(10, 34, 12).subtract(cylinder(12, 23, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 104).scale(scale).color(handleSteel));
p.part('handle-foot-left', sphere(13).translate(-24, 0, 84).scale(scale).color(handleSteel));
p.part('handle-foot-right', sphere(13).translate(24, 0, 84).scale(scale).color(handleSteel));

return p.model();
