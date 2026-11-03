// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "glass-crusher",
  license: 'CC0-1.0',
  title: "Glass crusher",
  description: "Glass crusher as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#566d6d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("glass-crusher");
p.part("base-frame", b(0,0,0,1440,850,170).color(color));
p.part("cutting-housing", b(0,0,170,1152.0,595.0,784.0000000000001).color(color));
p.part("feed-hopper-front", b(0,-357.0,784.0000000000001,1267.2,272.0,560.0).color(color));
p.part("feed-lip", b(0,-467.50000000000006,770.0000000000001,1296.0,130,85).color(color));
p.part("discharge-chute", b(0,357.0,170,892.8,204.0,489.99999999999994).color(color));
p.part("cutting-shaft-a", cy(-288.0,0,476.00000000000006,492.99999999999994,95,12).color(color));
p.part("cutting-shaft-b", cy(288.0,0,476.00000000000006,492.99999999999994,95,12).color(color));
p.part("side-service-panel", b(604.8,0,392.00000000000006,75,374.0,504.0).color(color));
p.part("drive-motor", c(820.8,221.0,210,330,135,10).color(color));
p.part("warning-beacon", c(-547.2,-255.0,1176.0,105,45,10).color(color));

return p.model();
