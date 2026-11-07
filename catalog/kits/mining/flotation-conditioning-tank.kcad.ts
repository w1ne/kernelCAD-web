// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "flotation-conditioning-tank",
  license: 'CC0-1.0',
  title: "Flotation conditioning tank",
  description: "Conditioning vessel with mixer gearbox, central shaft, paddle set, rim, and feed pipe. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#697b73", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("flotation-conditioning-tank");
p.part("tank", c(0, 0, 0, 610, 330, 12).color(color));
p.part("rim", c(0, 0, 600, 65, 355, 12).color(color));
p.part("shaft", c(0, 0, 170, 620, 34, 8).color(color));
p.part("gearbox", b(0, 0, 820, 240, 220, 165).color(color));
p.part("mixer-arm-left", b(-145, 0, 400, 360, 50, 45).color(color));
p.part("mixer-arm-right", b(145, 0, 400, 360, 50, 45).color(color));
p.part("paddle-left", b(-285, 0, 340, 70, 90, 210).color(color));
p.part("paddle-right", b(285, 0, 340, 70, 90, 210).color(color));
p.part("feed-nozzle", c(0, -370, 280, 130, 52, 8).color(color));

return p.model();
