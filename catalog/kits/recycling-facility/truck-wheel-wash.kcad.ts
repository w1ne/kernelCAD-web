// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "truck-wheel-wash",
  license: 'CC0-1.0',
  title: "Truck wheel-wash station",
  description: "Truck wheel-wash station as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("truck-wheel-wash");
p.part("wash-pad", b(0,0,0,2363.0,1050.0,140).color(color));
p.part("arch-left-leg", b(-806.1999999999999,0,140,130,140,1240).color(color));
p.part("arch-right-leg", b(806.1999999999999,0,140,130,140,1240).color(color));
p.part("arch-header", b(0,0,1260,150,1008.0,160).color(color));
p.part("spray-manifold", b(0,0,1090,100,756.0,65).color(color));
p.part("spray-nozzle-a", c(-556.0,-336.0,1030,130,25,10).color(color));
p.part("spray-nozzle-b", c(0,-336.0,1030,130,25,10).color(color));
p.part("spray-nozzle-c", c(556.0,-336.0,1030,130,25,10).color(color));

return p.model();
