// Foam Roller: Textured foam roller with a dark polymer core and contrasting end rings. Low-poly sports prop in millimetres, Z up; materials: eva roller foam, core polymer.
meta({
  name: 'foam-roller',
  license: 'CC0-1.0',
  title: 'Foam roller',
  description: "Textured foam roller with a dark polymer core and contrasting end rings. Material controls: eva roller foam, core polymer.",
  tags: ['foam roller', 'fitness', 'gym', 'recovery', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const evaFoam = param('evaFoam', '#537d78', { label: 'EVA roller foam' });
const corePolymer = param('corePolymer', '#263135', { label: 'Core polymer' });
presets({ clubColors: { evaFoam: '#cf7140', corePolymer: '#263135' } });
const p = assembly('foam-roller');
p.part('roller', cylinder(220, 50, 12).rotate([1, 0, 0], 90).translate(0, 110, 50).scale(scale).color(evaFoam));


// Contrasting end rings expose the roller's polymer core at each end.
for (const y of [-106, 106]) p.part(`core-end-ring-${y}`, cylinder(8, 49, 12).subtract(cylinder(10, 46, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, y, 50).color(corePolymer));

return p.model();
