// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "compost-aeration-header",
  license: 'CC0-1.0',
  title: "Compost aeration header",
  description: "Compost aeration header as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71804f", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("compost-aeration-header");
p.part("pallet-base", b(0,0,0,1450,900,95).color(color));
p.part("corner-post-left-front", b(-680.0,-405.0,95,70,70,965).color(color));
p.part("corner-post-right-front", b(680.0,-405.0,95,70,70,965).color(color));
p.part("corner-post-left-back", b(-680.0,405.0,95,70,70,965).color(color));
p.part("corner-post-right-back", b(680.0,405.0,95,70,70,965).color(color));
p.part("front-rail-1", b(0,-402.0,210.0,1360,35,35).color(color));
p.part("rear-rail-1", b(0,402.0,210.0,1360,35,35).color(color));
p.part("front-rail-2", b(0,-402.0,463.33333333333337,1360,35,35).color(color));
p.part("rear-rail-2", b(0,402.0,463.33333333333337,1360,35,35).color(color));
p.part("front-rail-3", b(0,-402.0,716.6666666666667,1360,35,35).color(color));
p.part("rear-rail-3", b(0,402.0,716.6666666666667,1360,35,35).color(color));
p.part("side-rail-left", b(-677.0,0,210,35,805,35).color(color));
p.part("side-rail-right", b(677.0,0,210,35,805,35).color(color));
p.part("corner-cap-a", c(-680.0,-405.0,1060,45,44,10).color(color));
p.part("corner-cap-b", c(680.0,405.0,1060,45,44,10).color(color));

return p.model();
