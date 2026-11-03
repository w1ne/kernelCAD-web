// Original kernelCAD low-poly compact two-axle track inspection trolley with a raised seat, handle bar and tool box.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "inspection-trolley",
  license: 'CC0-1.0',
  title: "Track inspection trolley",
  description: "Compact two-axle track inspection trolley with a raised seat, handle bar and tool box. Knobs: overall scale and asset color.",
  tags: ["inspection trolley", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#68736e", { label: 'Asset color' });
const p = assembly("inspection-trolley");
p.part("chassis", box(560,230,70,true).translate(0,0,160).scale(scale).translate(0, 0, 0).color(color));
p.part("seat-post", box(34,34,220,true).translate(-80,0,290).scale(scale).translate(0, 0, 0).color(color));
p.part("seat", box(210,180,44,true).translate(-80,0,420).scale(scale).translate(0, 0, 0).color(color));
p.part("handle-post", box(30,30,300,true).translate(210,0,310).scale(scale).translate(0, 0, 0).color(color));
p.part("handlebar", box(280,32,34,true).translate(210,0,470).scale(scale).translate(0, 0, 0).color(color));
p.part("tool-box", box(200,170,130,true).translate(30,0,258).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-left-front", cylinder(30,75,10).rotate([1,0,0],90).translate(-230,-130,75).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-left-back", cylinder(30,75,10).rotate([1,0,0],90).translate(230,-130,75).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-right-front", cylinder(30,75,10).rotate([1,0,0],90).translate(-230,100,75).scale(scale).translate(0, 0, 0).color(color));
p.part("wheel-right-back", cylinder(30,75,10).rotate([1,0,0],90).translate(230,100,75).scale(scale).translate(0, 0, 0).color(color));

return p.model();
