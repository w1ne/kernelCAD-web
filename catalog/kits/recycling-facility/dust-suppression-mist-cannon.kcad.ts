// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "dust-suppression-mist-cannon",
  license: 'CC0-1.0',
  title: "Dust-suppression mist cannon",
  description: "Dust-suppression mist cannon as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5c6c7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("dust-suppression-mist-cannon");
p.part("mobile-chassis", b(0,0,0,760,730,120).color(color));
p.part("turntable", b(0,0,120,350,350,120).color(color));
p.part("elevation-frame-left", b(-170,0,240,65,65,547.4000000000001).color(color));
p.part("elevation-frame-right", b(170,0,240,65,65,547.4000000000001).color(color));
p.part("spray-barrel", cy(0,0,676.1999999999999,547.1999999999999,105,10).color(color));
p.part("fan-hub", c(0,-189.8,676.1999999999999,170,145,10).color(color));
p.part("fan-ring", c(0,-189.8,676.1999999999999,90,220,10).color(color));
p.part("wheel-left", c(-266.0,292.0,0,180,75,10).color(color));
p.part("wheel-right", c(266.0,292.0,0,180,75,10).color(color));

return p.model();
