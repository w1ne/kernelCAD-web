// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "paper-bale-transport-frame",
  license: 'CC0-1.0',
  title: "Paper bale transport frame",
  description: "Paper bale transport frame as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#806d5d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("paper-bale-transport-frame");
p.part("pallet-base", b(0,0,0,1270,900,95).color(color));
p.part("corner-post-left-front", b(-590.0,-405.0,95,70,70,1035).color(color));
p.part("corner-post-right-front", b(590.0,-405.0,95,70,70,1035).color(color));
p.part("corner-post-left-back", b(-590.0,405.0,95,70,70,1035).color(color));
p.part("corner-post-right-back", b(590.0,405.0,95,70,70,1035).color(color));
p.part("front-rail-1", b(0,-402.0,210.0,1180,35,35).color(color));
p.part("rear-rail-1", b(0,402.0,210.0,1180,35,35).color(color));
p.part("front-rail-2", b(0,-402.0,486.6666666666667,1180,35,35).color(color));
p.part("rear-rail-2", b(0,402.0,486.6666666666667,1180,35,35).color(color));
p.part("front-rail-3", b(0,-402.0,763.3333333333334,1180,35,35).color(color));
p.part("rear-rail-3", b(0,402.0,763.3333333333334,1180,35,35).color(color));
p.part("side-rail-left", b(-587.0,0,210,35,805,35).color(color));
p.part("side-rail-right", b(587.0,0,210,35,805,35).color(color));
p.part("corner-cap-a", c(-590.0,-405.0,1130,45,44,10).color(color));
p.part("corner-cap-b", c(590.0,405.0,1130,45,44,10).color(color));

return p.model();
