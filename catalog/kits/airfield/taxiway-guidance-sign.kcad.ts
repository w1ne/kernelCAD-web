// Taxiway guidance sign: Freestanding airfield guidance sign with a wide panel, two posts and weighted feet. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'taxiway-guidance-sign',
  license: 'CC0-1.0',
  title: 'Taxiway guidance sign',
  description: 'Freestanding airfield guidance sign with a wide panel, two posts and weighted feet. Material controls: reflective sign film, galvanized steel, concrete feet. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const reflectiveFilm = param('reflectiveFilm', '#d7b83d', { label: 'Reflective sign film' });
const galvanizedSteel = param('galvanizedSteel', '#8d999b', { label: 'Galvanized steel' });
const concrete = param('concrete', '#858780', { label: 'Concrete feet' });

presets({
  weathered: {
    reflectiveFilm: '#806b39',
    galvanizedSteel: '#536267',
    concrete: '#555751',
  },
  highVisibility: {
    reflectiveFilm: '#f0c234',
    galvanizedSteel: '#aeb9bb',
    concrete: '#999990',
  },
});
const p = assembly("taxiway-guidance-sign");
p.part("panel", box(270, 38, 116, true).translate(0, 0, 225).scale(scale).color(reflectiveFilm));
p.part("left-post", box(14, 14, 192, true).translate(-96, 0, 96).scale(scale).color(galvanizedSteel));
p.part("right-post", box(14, 14, 192, true).translate(96, 0, 96).scale(scale).color(galvanizedSteel));
p.part("left-foot", box(60, 54, 16, true).translate(-96, 0, 8).scale(scale).color(concrete));
p.part("right-foot", box(60, 54, 16, true).translate(96, 0, 8).scale(scale).color(concrete));

return p.model();
