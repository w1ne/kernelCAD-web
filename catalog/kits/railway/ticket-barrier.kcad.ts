// Original kernelCAD low-poly station ticket gate with a pedestal reader, swing flap, card sensor and side rail.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "ticket-barrier",
  license: 'CC0-1.0',
  title: "Railway ticket barrier",
  description: "Station ticket gate with a pedestal reader, swing flap, card sensor and side rail. Knobs: overall scale and asset color.",
  tags: ["ticket barrier", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#50585d", { label: 'Asset color' });
const p = assembly("ticket-barrier");
p.part("base", box(350,180,52,true).translate(0,0,26).scale(scale).translate(0, 0, 0).color(color));
p.part("pedestal", box(180,160,620,true).translate(0,0,362).scale(scale).translate(0, 0, 0).color(color));
p.part("reader", box(230,200,110,true).translate(0,0,720).scale(scale).translate(0, 0, 0).color(color));
p.part("flap", box(290,26,180,true).translate(230,0,510).scale(scale).translate(0, 0, 0).color(color));
p.part("sensor", cylinder(18,26,10).translate(0,0,786).scale(scale).translate(0, 0, 0).color(color));
p.part("side-post", box(54,54,420,true).translate(-340,0,210).scale(scale).translate(0, 0, 0).color(color));
p.part("side-rail", box(720,34,36,true).translate(-170,0,390).scale(scale).translate(0, 0, 0).color(color));

return p.model();
