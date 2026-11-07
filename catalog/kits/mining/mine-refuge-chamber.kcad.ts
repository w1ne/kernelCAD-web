// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mine-refuge-chamber",
  license: 'CC0-1.0',
  title: "Mine refuge chamber",
  description: "Underground refuge pod with reinforced shell, access door, roof rails, and external air bottles. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71816e", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("mine-refuge-chamber");
p.part("floor-skid", b(0, 0, 0, 1050, 610, 70).color(color));
p.part("pod-body", b(0, 0, 70, 980, 540, 520).color(color));
p.part("roof-cap", b(0, 0, 590, 1020, 580, 80).color(color));
p.part("entry-door", b(0, -285, 125, 310, 35, 400).color(color));
p.part("window-panel", b(290, -286, 340, 180, 28, 115).color(color));
p.part("air-bottle-left", c(-360, 360, 80, 530, 82, 10).color(color));
p.part("air-bottle-right", c(-130, 360, 80, 530, 82, 10).color(color));
p.part("roof-rail", b(0, 300, 680, 960, 35, 40).color(color));

return p.model();
