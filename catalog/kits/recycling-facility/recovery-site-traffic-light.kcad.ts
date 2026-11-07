// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "recovery-site-traffic-light",
  license: 'CC0-1.0',
  title: "Recovery-site traffic light",
  description: "Recovery-site traffic light as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#47758a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("recovery-site-traffic-light");
p.part("mounting-plinth", b(0,0,0,520,420,120).color(color));
p.part("pedestal-column", b(0,0,120,180,180,609.0).color(color));
p.part("equipment-head", b(0,-40,729.0,722.8000000000001,210,340).color(color));
p.part("sun-hood", b(0,-160,1069.0,778.4000000000001,330,55).color(color));
p.part("service-door", b(0,-155,789.0,514.3,35,190).color(color));
p.part("antenna", b(319.7,40,1069.0,20,20,260).color(color));
p.part("warning-beacon", c(-319.7,-80,1039.0,115,55,10).color(color));
p.part("cable-gland", c(0,95,130,115,30,10).color(color));

return p.model();
