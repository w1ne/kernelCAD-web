// Original kernelCAD low-poly freestanding station timetable board with a framed display panel, roof cap and twin post supports.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "timetable-board",
  license: 'CC0-1.0',
  title: "Station timetable board",
  description: "Freestanding station timetable board with a framed display panel, roof cap and twin post supports. Knobs: overall scale and asset color.",
  tags: ["timetable board", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#536069", { label: 'Asset color' });
const p = assembly("timetable-board");
p.part("panel", box(640,58,450,true).translate(0,0,530).scale(scale).translate(0, 0, 0).color(color));
p.part("display", box(560,12,360,true).translate(0,-36,540).scale(scale).translate(0, 0, 0).color(color));
p.part("top-cap", box(700,100,42,true).translate(0,0,780).scale(scale).translate(0, 0, 0).color(color));
p.part("post-left", box(42,42,360,true).translate(-230,0,180).scale(scale).translate(0, 0, 0).color(color));
p.part("post-right", box(42,42,360,true).translate(230,0,180).scale(scale).translate(0, 0, 0).color(color));
p.part("foot-left", box(150,150,30,true).translate(-230,0,15).scale(scale).translate(0, 0, 0).color(color));
p.part("foot-right", box(150,150,30,true).translate(230,0,15).scale(scale).translate(0, 0, 0).color(color));

return p.model();
