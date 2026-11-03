// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "site-boundary-gate",
  license: 'CC0-1.0',
  title: "Site boundary gate",
  description: "Site boundary gate as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("site-boundary-gate");
p.part("control-pedestal", b(-535.0,0,0,320,460,787.4).color(color));
p.part("counterweight-box", b(-535.0,0,787.4,360,500,120).color(color));
p.part("boom-arm", b(220,0,850.9000000000001,1390,90,90).color(color));
p.part("boom-tip", b(905.0,0,850.9000000000001,110,115,110).color(color));
p.part("photo-eye-post", b(875.0,-310.0,0,75,75,685.8000000000001).color(color));
p.part("beacon", c(-535.0,-200,787.4,110,54,10).color(color));
p.part("hinge-drum", c(-375.0,0,800.1,130,70,10).color(color));

return p.model();
