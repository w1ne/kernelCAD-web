// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "two-ram-baler",
  license: 'CC0-1.0',
  title: "Two-ram baler",
  description: "Two-ram baler as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7d6752", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("two-ram-baler");
p.part("base-skid", b(0,0,0,1310,990,125).color(color));
p.part("press-chamber", b(0,0,125,1074.2,772.2,1085.0).color(color));
p.part("front-door-frame", b(0,-425.7,160,890.8000000000001,110,837.0).color(color));
p.part("press-plate", b(0,-257.40000000000003,852.5000000000001,838.4,210,160).color(color));
p.part("upper-gantry", b(0,0,1209.0,1257.6,891.0,160).color(color));
p.part("discharge-floor", b(0,-475.2,110,759.8,190,120).color(color));
p.part("control-cabinet", b(733.6,0,0,300,360,930.0).color(color));
p.part("hydraulic-cylinder", cy(0,237.6,1131.5,280,115,10).color(color));
p.part("pressure-gauge", c(694.3000000000001,-217.8,868.0000000000001,120,45,10).color(color));

return p.model();
