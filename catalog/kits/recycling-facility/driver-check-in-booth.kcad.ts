// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "driver-check-in-booth",
  license: 'CC0-1.0',
  title: "Driver check-in booth",
  description: "Driver check-in booth as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#55766b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("driver-check-in-booth");
p.part("floor-skid", b(0,0,0,1050,730,90).color(color));
p.part("rear-wall", b(0,325.0,90,1050,80,1290).color(color));
p.part("left-wall", b(-485.0,0,90,80,650,1290).color(color));
p.part("right-wall", b(485.0,0,90,80,650,1290).color(color));
p.part("front-counter", b(0,-295.0,90,1050,140,524.4).color(color));
p.part("roof", b(0,0,1330,1150,830,100).color(color));
p.part("window-header", b(0,-290.0,993.5999999999999,756.0,45,55).color(color));
p.part("service-panel", b(0,-310.0,703.8000000000001,567.0,40,303.6).color(color));
p.part("corner-beacon", c(399.0,-277.4,1220,100,45,10).color(color));

return p.model();
