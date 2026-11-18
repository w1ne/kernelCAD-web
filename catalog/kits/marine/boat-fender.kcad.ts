// Boat fender: An inflated cylindrical fender has end caps and reinforced eye loops. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "boat-fender",
  license: 'CC0-1.0',
  title: "Boat fender",
  description: "Boat fender: An inflated cylindrical fender has end caps and reinforced eye loops. Low-poly visualization prop. Material controls: rubber, stainless steel.",
  tags: ["boat fender", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { rubber: '#434542', stainlessSteel: '#a9b1af' },
  highVisibility: { rubber: '#675746' },
});
const p = assembly("boat-fender");
p.part("body", (sphere(110).scale([0.62, 0.62, 1.4]).translate(0, 0, 160)).translate(0, 0, -6).scale(scale).color(rubber));
p.part("top-eye", (cylinder(38, 30, 10).subtract(cylinder(40, 16, 10).translate(0, 0, -1)).translate(0, 0, 296)).translate(0, 0, -6).scale(scale).color(stainlessSteel));
p.part("bottom-eye", (cylinder(38, 30, 10).subtract(cylinder(40, 16, 10).translate(0, 0, -1)).translate(0, 0, 8)).translate(0, 0, -6).scale(scale).color(stainlessSteel));
p.part("cap-top", (cylinder(16, 42, 10).translate(0, 0, 280)).translate(0, 0, -6).scale(scale).color(rubber));
p.part("cap-bottom", (cylinder(16, 42, 10).translate(0, 0, 24)).translate(0, 0, -6).scale(scale).color(rubber));

return p.model();
