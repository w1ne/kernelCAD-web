// Original kernelCAD low-poly railway platform bench with a slatted seat, backrest, armrests and four simple legs.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "station-bench",
  license: 'CC0-1.0',
  title: "Station bench",
  description: "Railway platform bench with a slatted seat, backrest, armrests and four simple legs. Knobs: overall scale and asset color.",
  tags: ["station bench", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#725e49", { label: 'Asset color' });
const p = assembly("station-bench");
p.part("seat", box(520,160,42,true).translate(0,0,260).scale(scale).translate(0, 0, 0).color(color));
p.part("back", box(520,40,220,true).translate(0,72,380).scale(scale).translate(0, 0, 0).color(color));
p.part("slat-seat-1", box(520,26,28,true).translate(0,-48,294).scale(scale).translate(0, 0, 0).color(color));
p.part("slat-seat-2", box(520,26,28,true).translate(0,0,294).scale(scale).translate(0, 0, 0).color(color));
p.part("slat-seat-3", box(520,26,28,true).translate(0,48,294).scale(scale).translate(0, 0, 0).color(color));
p.part("leg-left-front", box(34,34,260,true).translate(-220,-55,130).scale(scale).translate(0, 0, 0).color(color));
p.part("leg-right-front", box(34,34,260,true).translate(220,-55,130).scale(scale).translate(0, 0, 0).color(color));
p.part("leg-left-back", box(34,34,260,true).translate(-220,55,130).scale(scale).translate(0, 0, 0).color(color));
p.part("leg-right-back", box(34,34,260,true).translate(220,55,130).scale(scale).translate(0, 0, 0).color(color));
p.part("arm-left", box(46,200,34,true).translate(-235,0,405).scale(scale).translate(0, 0, 0).color(color));
p.part("arm-right", box(46,200,34,true).translate(235,0,405).scale(scale).translate(0, 0, 0).color(color));

return p.model();
