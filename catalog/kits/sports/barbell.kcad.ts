// Barbell: Low-poly barbell with a long horizontal shaft and stacked spherical plate forms. Low-poly sports prop in millimetres, Z up; materials: chrome steel, bumper plate rubber, knurled grip steel.
meta({
  name: 'barbell',
  license: 'CC0-1.0',
  title: 'Barbell',
  description: "Low-poly barbell with a long horizontal shaft and stacked spherical plate forms. Material controls: chrome steel, bumper plate rubber, knurled grip steel.",
  tags: ['barbell', 'weight bar', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const chromedSteel = param('chromedSteel', '#9da9ad', { label: 'Chrome steel' });
const bumperRubber = param('bumperRubber', '#30363a', { label: 'Bumper plate rubber' });
const knurlSteel = param('knurlSteel', '#c0c7c6', { label: 'Knurled grip steel' });
presets({ clubColors: { chromedSteel: '#9da9ad', bumperRubber: '#3b6b8b' } });
const p = assembly('barbell');
p.part('shaft', box(680, 16, 16, true).translate(0, 0, 78).scale(scale).color(chromedSteel));
p.part('left-inner-plate', sphere(58).scale([0.28, 1, 1]).translate(-224, 0, 74).scale(scale).color(bumperRubber));
p.part('left-outer-plate', sphere(74).scale([0.28, 1, 1]).translate(-280, 0, 74).scale(scale).color(bumperRubber));
p.part('right-inner-plate', sphere(58).scale([0.28, 1, 1]).translate(224, 0, 74).scale(scale).color(bumperRubber));
p.part('right-outer-plate', sphere(74).scale([0.28, 1, 1]).translate(280, 0, 74).scale(scale).color(bumperRubber));


// A polished centre grip sleeve separates the working shaft from its bumper plates.
p.part("knurl-grip-sleeve", box(76, 18.4, 18.4, true).translate(0, 0, 78).color(knurlSteel));

return p.model();
