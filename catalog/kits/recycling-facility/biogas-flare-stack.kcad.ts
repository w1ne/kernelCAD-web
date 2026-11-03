// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "biogas-flare-stack",
  license: 'CC0-1.0',
  title: "Biogas flare stack",
  description: "Biogas flare stack as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#82714c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("biogas-flare-stack");
p.part("mounting-pad", b(0,0,0,1000,840,120).color(color));
p.part("riser-pipe", c(0,0,120,1211.0,95,10).color(color));
p.part("flare-stack", c(0,0,1384.0,484.40000000000003,145,10).color(color));
p.part("service-box", b(350.0,-285.6,150,240,210,380).color(color));
p.part("valve-wheel", c(0,-285.6,260,50,150,10).color(color));
p.part("horizontal-connection", cy(0,285.6,180,320,55,10).color(color));

return p.model();
