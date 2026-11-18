// Runway threshold light array: Portable runway threshold bar with a low aluminium base and alternating red and green optical lamps. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'runway-threshold-light-array',
  license: 'CC0-1.0',
  title: 'Runway threshold light array',
  description: 'Portable runway threshold bar with a low aluminium base and alternating red and green optical lamps. Material controls: aluminium bar, red optical glass, green optical glass. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const aluminium = param('aluminium', '#8e9b9e', { label: 'Aluminium bar' });
const redLens = param('redLens', '#c84036', { label: 'Red optical glass' });
const greenLens = param('greenLens', '#4c9b62', { label: 'Green optical glass' });

presets({
  weathered: {
    aluminium: '#536267',
    redLens: '#842f2b',
    greenLens: '#2d6840',
  },
  highVisibility: {
    aluminium: '#aeb9bb',
    redLens: '#c84036',
    greenLens: '#4c9b62',
  },
});
const p = assembly("runway-threshold-light-array");
p.part("base-bar", box(420, 56, 14, true).translate(0, 0, 7).scale(scale).color(aluminium));
p.part("left-light-01", cylinder(30, 11, 8).translate(-190, -27, 14).scale(scale).color(redLens));
p.part("right-light-01", cylinder(30, 11, 8).translate(-190, 27, 14).scale(scale).color(greenLens));
p.part("left-light-02", cylinder(30, 11, 8).translate(-142.5, -27, 14).scale(scale).color(redLens));
p.part("right-light-02", cylinder(30, 11, 8).translate(-142.5, 27, 14).scale(scale).color(greenLens));
p.part("left-light-03", cylinder(30, 11, 8).translate(-95, -27, 14).scale(scale).color(redLens));
p.part("right-light-03", cylinder(30, 11, 8).translate(-95, 27, 14).scale(scale).color(greenLens));
p.part("left-light-04", cylinder(30, 11, 8).translate(-47.5, -27, 14).scale(scale).color(redLens));
p.part("right-light-04", cylinder(30, 11, 8).translate(-47.5, 27, 14).scale(scale).color(greenLens));
p.part("left-light-05", cylinder(30, 11, 8).translate(0, -27, 14).scale(scale).color(redLens));
p.part("right-light-05", cylinder(30, 11, 8).translate(0, 27, 14).scale(scale).color(greenLens));
p.part("left-light-06", cylinder(30, 11, 8).translate(47.5, -27, 14).scale(scale).color(redLens));
p.part("right-light-06", cylinder(30, 11, 8).translate(47.5, 27, 14).scale(scale).color(greenLens));
p.part("left-light-07", cylinder(30, 11, 8).translate(95, -27, 14).scale(scale).color(redLens));
p.part("right-light-07", cylinder(30, 11, 8).translate(95, 27, 14).scale(scale).color(greenLens));
p.part("left-light-08", cylinder(30, 11, 8).translate(142.5, -27, 14).scale(scale).color(redLens));
p.part("right-light-08", cylinder(30, 11, 8).translate(142.5, 27, 14).scale(scale).color(greenLens));
p.part("left-light-09", cylinder(30, 11, 8).translate(190, -27, 14).scale(scale).color(redLens));
p.part("right-light-09", cylinder(30, 11, 8).translate(190, 27, 14).scale(scale).color(greenLens));

return p.model();
