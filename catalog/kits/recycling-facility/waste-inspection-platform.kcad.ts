// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "waste-inspection-platform",
  license: 'CC0-1.0',
  title: "Waste inspection platform",
  description: "Waste inspection platform as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b6f56", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("waste-inspection-platform");
p.part("platform-deck", b(0,0,620,1830.0,949.0,100).color(color));
p.part("front-apron", b(0,-452.6,390,1769.0,70,230).color(color));
p.part("rear-rail", b(0,445.3,720,1683.6,55,50).color(color));
p.part("left-post", b(-829.6,350.4,0,70,70,700).color(color));
p.part("right-post", b(829.6,350.4,0,70,70,700).color(color));
p.part("cross-brace", b(0,0,250,70,730,55).color(color));
p.part("level-foot-left", c(-780.8000000000001,-401.50000000000006,0,100,38,10).color(color));
p.part("level-foot-right", c(780.8000000000001,-401.50000000000006,0,100,38,10).color(color));

return p.model();
