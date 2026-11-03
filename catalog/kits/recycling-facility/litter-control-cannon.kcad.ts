// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "litter-control-cannon",
  license: 'CC0-1.0',
  title: "Litter control cannon",
  description: "Litter control cannon as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c6955", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("litter-control-cannon");
p.part("mobile-chassis", b(0,0,0,1120,620,120).color(color));
p.part("turntable", b(0,0,120,350,350,120).color(color));
p.part("elevation-frame-left", b(-170,0,240,65,65,506.6).color(color));
p.part("elevation-frame-right", b(170,0,240,65,65,506.6).color(color));
p.part("spray-barrel", cy(0,0,625.8,806.4,105,10).color(color));
p.part("fan-hub", c(0,-161.20000000000002,625.8,170,145,10).color(color));
p.part("fan-ring", c(0,-161.20000000000002,625.8,90,220,10).color(color));
p.part("wheel-left", c(-392.0,248.0,0,180,75,10).color(color));
p.part("wheel-right", c(392.0,248.0,0,180,75,10).color(color));

return p.model();
