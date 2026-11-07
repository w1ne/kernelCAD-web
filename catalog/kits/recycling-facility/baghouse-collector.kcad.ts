// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "baghouse-collector",
  license: 'CC0-1.0',
  title: "Baghouse collector",
  description: "Baghouse collector as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("baghouse-collector");
p.part("service-base", b(0,0,0,1310,850,110).color(color));
p.part("filter-cabinet", b(0,0,110,1113.5,646.0,1116.0).color(color));
p.part("access-door-left", b(-288.2,-357.0,220,445.40000000000003,65,697.5).color(color));
p.part("access-door-right", b(288.2,-357.0,220,445.40000000000003,65,697.5).color(color));
p.part("inlet-duct", b(0,-484.49999999999994,1054.0,497.8,240,280).color(color));
p.part("outlet-duct", b(0,467.50000000000006,1178.0,419.2,250,360).color(color));
p.part("support-leg-left", b(-393.0,255.0,0,85,85,350).color(color));
p.part("support-leg-right", b(393.0,255.0,0,85,85,350).color(color));
p.part("filter-canister-1", c(-445.40000000000003,68.0,1271.0,300,70,10).color(color));
p.part("filter-canister-2", c(-157.20000000000005,68.0,1271.0,300,70,10).color(color));
p.part("filter-canister-3", c(130.99999999999994,68.0,1271.0,300,70,10).color(color));
p.part("filter-canister-4", c(419.1999999999999,68.0,1271.0,300,70,10).color(color));

return p.model();
