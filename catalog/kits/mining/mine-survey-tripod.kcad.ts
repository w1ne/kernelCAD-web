// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mine-survey-tripod",
  license: 'CC0-1.0',
  title: "Mine survey tripod",
  description: "Survey tripod with three sturdy legs, rotating instrument platform, telescope block, and control panel. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b7874e", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("mine-survey-tripod");
p.part("leg-front", b(0, -170, 0, 80, 90, 760).color(color));
p.part("leg-left", b(-180, 130, 0, 80, 90, 760).color(color));
p.part("leg-right", b(180, 130, 0, 80, 90, 760).color(color));
p.part("mounting-plate", c(0, 0, 755, 70, 180, 10).color(color));
p.part("instrument-body", b(0, 0, 825, 330, 230, 155).color(color));
p.part("telescope", c(160, 0, 850, 80, 65, 10).color(color));
p.part("display", b(0, -125, 890, 130, 28, 80).color(color));
p.part("carry-handle", b(0, 0, 980, 210, 90, 35).color(color));

return p.model();
