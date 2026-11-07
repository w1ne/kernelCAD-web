// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "stormwater-settling-basin",
  license: 'CC0-1.0',
  title: "Stormwater settling basin",
  description: "Stormwater settling basin as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#64757a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stormwater-settling-basin");
p.part("basin-floor", b(0,0,0,1320.0,1021.9999999999999,100).color(color));
p.part("front-berm", b(0,-459.9,100,1320.0,160,687.5).color(color));
p.part("back-berm", b(0,459.9,100,1320.0,160,687.5).color(color));
p.part("left-berm", b(-616.0,0,100,160,876.0,687.5).color(color));
p.part("right-berm", b(616.0,0,100,160,876.0,687.5).color(color));
p.part("walkway", b(0,-255.49999999999997,525.0,1056.0,140,60).color(color));
p.part("sample-pipe", c(440.0,0,0,1250,38,10).color(color));
p.part("level-gauge", c(-484.00000000000006,0,120,900.0,45,10).color(color));

return p.model();
