// Original kernelCAD low-poly electric locomotive with a broad cab, twin end windows, roof equipment and raised pantograph frame.
// Millimetres, Z up, base on z = 0. All visible parts share one color control.

meta({
  name: "electric-locomotive",
  license: 'CC0-1.0',
  title: "Electric locomotive",
  description: "Electric locomotive with a broad cab, twin end windows, roof equipment and raised pantograph frame. Knobs: overall scale and asset color.",
  tags: ["electric locomotive", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#4c5b63", { label: 'Asset color' });
const p = assembly("electric-locomotive");
p.part("frame", box(880,300,110,true).translate(0,0,180).scale(scale).translate(0, 0, -14).color(color));
p.part("body", box(820,300,380,true).translate(0,0,395).scale(scale).translate(0, 0, -14).color(color));
p.part("nose-left", box(170,300,250,true).rotate([0,1,0],-16).translate(480,0,330).scale(scale).translate(0, 0, -14).color(color));
p.part("cab", box(220,302,300,true).translate(440,0,360).scale(scale).translate(0, 0, -14).color(color));
p.part("front-window", box(14,210,120,true).translate(551,-2,400).scale(scale).translate(0, 0, -14).color(color));
p.part("roof", box(840,315,40,true).translate(0,0,606).scale(scale).translate(0, 0, -14).color(color));
p.part("pantograph-base", box(240,110,30,true).translate(-100,0,644).scale(scale).translate(0, 0, -14).color(color));
p.part("pantograph-left", box(20,25,210,true).rotate([0,1,0],-20).translate(-210,0,760).scale(scale).translate(0, 0, -14).color(color));
p.part("pantograph-right", box(20,25,210,true).rotate([0,1,0],20).translate(10,0,760).scale(scale).translate(0, 0, -14).color(color));
p.part("pantograph-top", box(240,28,20,true).translate(-100,0,860).scale(scale).translate(0, 0, -14).color(color));
p.part("wheel-left-a", cylinder(34,96,12).rotate([1,0,0],90).translate(-300,-104,110).scale(scale).translate(0, 0, -14).color(color));
p.part("wheel-left-b", cylinder(34,96,12).rotate([1,0,0],90).translate(0,-104,110).scale(scale).translate(0, 0, -14).color(color));
p.part("wheel-left-c", cylinder(34,96,12).rotate([1,0,0],90).translate(300,-104,110).scale(scale).translate(0, 0, -14).color(color));
p.part("wheel-right-a", cylinder(34,96,12).rotate([1,0,0],90).translate(-300,138,110).scale(scale).translate(0, 0, -14).color(color));
p.part("wheel-right-b", cylinder(34,96,12).rotate([1,0,0],90).translate(0,138,110).scale(scale).translate(0, 0, -14).color(color));
p.part("wheel-right-c", cylinder(34,96,12).rotate([1,0,0],90).translate(300,138,110).scale(scale).translate(0, 0, -14).color(color));

return p.model();
