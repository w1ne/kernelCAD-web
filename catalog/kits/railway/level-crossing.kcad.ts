// Original kernelCAD low-poly road crossing over a short rail section with two road panels, flangeway grooves and warning posts.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "level-crossing",
  license: 'CC0-1.0',
  title: "Railway level crossing",
  description: "Road crossing over a short rail section with two road panels, flangeway grooves and warning posts. Knobs: overall scale and asset color.",
  tags: ["level crossing", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#5a6064", { label: 'Asset color' });
const p = assembly("level-crossing");
p.part("road", box(760,900,48,true).translate(0,0,24).scale(scale).translate(0, 0, 0).color(color));
p.part("rail-left", box(1500,34,52,true).translate(0,-84,56).scale(scale).translate(0, 0, 0).color(color));
p.part("rail-right", box(1500,34,52,true).translate(0,84,56).scale(scale).translate(0, 0, 0).color(color));
p.part("road-panel-left", box(600,250,25,true).translate(0,-210,60).scale(scale).translate(0, 0, 0).color(color));
p.part("road-panel-right", box(600,250,25,true).translate(0,210,60).scale(scale).translate(0, 0, 0).color(color));
p.part("warning-post-left", box(44,44,550,true).translate(-440,-320,300).scale(scale).translate(0, 0, 0).color(color));
p.part("warning-post-right", box(44,44,550,true).translate(440,320,300).scale(scale).translate(0, 0, 0).color(color));
p.part("crossbar-left", box(360,32,32,true).translate(-440,-320,550).scale(scale).translate(0, 0, 0).color(color));
p.part("crossbar-right", box(360,32,32,true).translate(440,320,550).scale(scale).translate(0, 0, 0).color(color));

return p.model();
