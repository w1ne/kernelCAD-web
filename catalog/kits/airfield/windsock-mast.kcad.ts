// Windsock mast: Airfield windsock on a tall mast with a circular support frame and tapered fabric sleeve. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'windsock-mast',
  license: 'CC0-1.0',
  title: 'Windsock mast',
  description: 'Airfield windsock on a tall mast with a circular support frame and tapered fabric sleeve. Material controls: galvanized steel, windsock fabric, reflective fabric. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#879497', { label: 'Galvanized steel' });
const fabric = param('fabric', '#e15b34', { label: 'Windsock fabric' });
const reflectiveFilm = param('reflectiveFilm', '#eee5cf', { label: 'Reflective fabric' });

presets({
  weathered: {
    galvanizedSteel: '#536267',
    fabric: '#945b3c',
    reflectiveFilm: '#806b39',
  },
  highVisibility: {
    galvanizedSteel: '#aeb9bb',
    fabric: '#ed6739',
    reflectiveFilm: '#f0c234',
  },
});
const p = assembly("windsock-mast");
p.part("mast", cylinder(520, 8, 8).scale(scale).color(galvanizedSteel));
p.part("support-ring", cylinder(10, 68, 12).subtract(cylinder(12, 54, 12).translate(0, 0, -1)).translate(0, 0, 472).scale(scale).color(galvanizedSteel));
p.part("sock-tail", sphere(52).scale([2, 0.3, 0.3]).translate(100, 0, 472).scale(scale).color(fabric));
p.part("sock-mouth", cylinder(32, 45, 8).rotate([0, 1, 0], 90).translate(27, 0, 472).scale(scale).color(reflectiveFilm));
p.part("left-ring-support", box(8, 8, 46, true).translate(-48, 0, 494).scale(scale).color(galvanizedSteel));
p.part("right-ring-support", box(8, 8, 46, true).translate(48, 0, 494).scale(scale).color(galvanizedSteel));
p.part("front-ring-support", box(8, 8, 46, true).translate(0, -48, 494).scale(scale).color(galvanizedSteel));
p.part("back-ring-support", box(8, 8, 46, true).translate(0, 48, 494).scale(scale).color(galvanizedSteel));

return p.model();
