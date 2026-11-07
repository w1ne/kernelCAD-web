// Trophy Cup: Low-poly award cup with an open bowl, stem, handles and stepped base. Low-poly sports prop in millimetres, Z up; materials: gold-plated metal, walnut base, engraving inlay.
meta({
  name: 'trophy-cup',
  license: 'CC0-1.0',
  title: 'Trophy cup',
  description: "Low-poly award cup with an open bowl, stem, handles and stepped base. Material controls: gold-plated metal, walnut base, engraving inlay.",
  tags: ['trophy cup', 'trophy', 'award', 'sports', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const goldPlating = param('goldPlating', '#c6a640', { label: 'Gold-plated metal' });
const walnutBase = param('walnutBase', '#765139', { label: 'Walnut base' });
const engravingInlay = param('engravingInlay', '#f0db88', { label: 'Engraving inlay' });
presets({ clubColors: { goldPlating: '#b9c1c1', walnutBase: '#765139' } });
const p = assembly('trophy-cup');
p.part('base', box(98, 72, 14, true).translate(0, 0, 7).scale(scale).color(walnutBase));
p.part('stem', cylinder(54, 13, 10).translate(0, 0, 14).scale(scale).color(goldPlating));
p.part('bowl', cylinder(74, 54, 12).subtract(cylinder(65, 43, 12).translate(0, 0, 20)).translate(0, 0, 68).scale(scale).color(goldPlating));
p.part('left-handle', sphere(33).scale([0.55, 0.8, 1.2]).translate(-68, 0, 106).scale(scale).color(goldPlating));
p.part('right-handle', sphere(33).scale([0.55, 0.8, 1.2]).translate(68, 0, 106).scale(scale).color(goldPlating));
p.part('top-rim', cylinder(8, 57, 12).subtract(cylinder(10, 43, 12).translate(0, 0, -1)).translate(0, 0, 135).scale(scale).color(engravingInlay));

return p.model();
