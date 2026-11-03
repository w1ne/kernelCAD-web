// Original kernelCAD low-poly rail crossing warning signal with paired circular lamps, protective hoods and a mounting bracket.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "crossing-warning-light",
  license: 'CC0-1.0',
  title: "Rail crossing warning light",
  description: "Rail crossing warning signal with paired circular lamps, protective hoods and a mounting bracket. Knobs: overall scale and asset color.",
  tags: ["crossing warning light", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#d3513f", { label: 'Asset color' });
const p = assembly("crossing-warning-light");
p.part("post", cylinder(760,24,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(color));
p.part("backplate", box(230,60,300,true).translate(0,-28,650).scale(scale).translate(0, 0, 0).color(color));
p.part("lamp-left", cylinder(46,72,12).rotate([1,0,0],90).translate(-55,-70,700).scale(scale).translate(0, 0, 0).color(color));
p.part("lamp-right", cylinder(46,72,12).rotate([1,0,0],90).translate(55,-70,700).scale(scale).translate(0, 0, 0).color(color));
p.part("hood-left", box(120,70,34,true).translate(-55,-75,760).scale(scale).translate(0, 0, 0).color(color));
p.part("hood-right", box(120,70,34,true).translate(55,-75,760).scale(scale).translate(0, 0, 0).color(color));
p.part("mount", box(140,100,34,true).translate(0,0,520).scale(scale).translate(0, 0, 0).color(color));
p.part("base", cylinder(34,68,8).translate(0,0,0).scale(scale).translate(0, 0, 0).color(color));

return p.model();
