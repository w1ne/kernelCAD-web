// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "twin-shaft-shredder",
  license: 'CC0-1.0',
  title: "Twin-shaft shredder",
  description: "Twin-shaft shredder as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5f7380", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("twin-shaft-shredder");
p.part("base-frame", b(0,0,0,1050,850,170).color(color));
p.part("cutting-housing", b(0,0,170,840.0,595.0,868.0000000000001).color(color));
p.part("feed-hopper-front", b(0,-357.0,868.0000000000001,924.0,272.0,620.0).color(color));
p.part("feed-lip", b(0,-467.50000000000006,852.5000000000001,945.0,130,85).color(color));
p.part("discharge-chute", b(0,357.0,170,651.0,204.0,542.5).color(color));
p.part("cutting-shaft-a", cy(-210.0,0,527.0,492.99999999999994,95,12).color(color));
p.part("cutting-shaft-b", cy(210.0,0,527.0,492.99999999999994,95,12).color(color));
p.part("side-service-panel", b(441.0,0,434.00000000000006,75,374.0,558.0).color(color));
p.part("drive-motor", c(598.5,221.0,210,330,135,10).color(color));
p.part("warning-beacon", c(-399.0,-255.0,1302.0,105,45,10).color(color));

return p.model();
