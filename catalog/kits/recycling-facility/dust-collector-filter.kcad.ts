// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "dust-collector-filter",
  license: 'CC0-1.0',
  title: "Dust collector filter",
  description: "Dust collector filter as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b7756", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("dust-collector-filter");
p.part("service-base", b(0,0,0,1180,1130,110).color(color));
p.part("filter-cabinet", b(0,0,110,1003.0,858.8,1008.0).color(color));
p.part("access-door-left", b(-259.6,-474.59999999999997,220,401.20000000000005,65,630.0).color(color));
p.part("access-door-right", b(259.6,-474.59999999999997,220,401.20000000000005,65,630.0).color(color));
p.part("inlet-duct", b(0,-644.0999999999999,952.0000000000001,448.4,240,280).color(color));
p.part("outlet-duct", b(0,621.5,1064.0,377.6,250,360).color(color));
p.part("support-leg-left", b(-354.0,339.0,0,85,85,350).color(color));
p.part("support-leg-right", b(354.0,339.0,0,85,85,350).color(color));
p.part("filter-canister-1", c(-401.20000000000005,90.4,1148.0,300,70,10).color(color));
p.part("filter-canister-2", c(-141.60000000000002,90.4,1148.0,300,70,10).color(color));
p.part("filter-canister-3", c(118.0,90.4,1148.0,300,70,10).color(color));
p.part("filter-canister-4", c(377.6,90.4,1148.0,300,70,10).color(color));

return p.model();
