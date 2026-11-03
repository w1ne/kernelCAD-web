// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "sample-material-tote",
  license: 'CC0-1.0',
  title: "Sample material tote",
  description: "Sample material tote as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#60766f", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("sample-material-tote");
p.part("base-skids", b(0,0,0,1270,820,100).color(color));
p.part("body", b(0,0,100,1190,740,890).color(color));
p.part("top-cover", b(0,0,990,1290,840,65).color(color));
p.part("access-panel", b(0,-435.0,534.6,584.2,35,415.8).color(color));
p.part("handle-left", b(-431.8,-470.0,544.5,120,45,130).color(color));
p.part("handle-right", b(431.8,-470.0,544.5,120,45,130).color(color));
p.part("left-wheel", cy(-563.0,480.0,105,70,72,10).color(color));
p.part("right-wheel", cy(563.0,480.0,105,70,72,10).color(color));
p.part("left-wheel-far", cy(-563.0,-340.0,105,70,72,10).color(color));
p.part("right-wheel-far", cy(563.0,-340.0,105,70,72,10).color(color));

return p.model();
