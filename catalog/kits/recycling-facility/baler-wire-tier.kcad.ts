// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "baler-wire-tier",
  license: 'CC0-1.0',
  title: "Baler wire tier",
  description: "Baler wire tier as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("baler-wire-tier");
p.part("base-skid", b(0,0,0,1440,1130,125).color(color));
p.part("press-chamber", b(0,0,125,1180.8,881.4,1190.0).color(color));
p.part("front-door-frame", b(0,-485.9,160,979.2,110,918.0000000000001).color(color));
p.part("press-plate", b(0,-293.8,935.0000000000001,921.6,210,160).color(color));
p.part("upper-gantry", b(0,0,1326.0,1382.3999999999999,1017.0,160).color(color));
p.part("discharge-floor", b(0,-542.4,110,835.1999999999999,190,120).color(color));
p.part("control-cabinet", b(806.4000000000001,0,0,300,360,1020.0).color(color));
p.part("hydraulic-cylinder", cy(0,271.2,1241.0,280,115,10).color(color));
p.part("pressure-gauge", c(763.2,-248.6,952.0000000000001,120,45,10).color(color));

return p.model();
