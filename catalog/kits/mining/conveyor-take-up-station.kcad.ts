// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "conveyor-take-up-station",
  license: 'CC0-1.0',
  title: "Conveyor take-up station",
  description: "Belt take-up frame with paired guide rails, tension carriage, counterweight block, and return drum. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727970", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("conveyor-take-up-station");
p.part("base", b(0, 0, 0, 1050, 680, 70).color(color));
p.part("rail-left", b(0, -250, 70, 900, 65, 100).color(color));
p.part("rail-right", b(0, 250, 70, 900, 65, 100).color(color));
p.part("tower-left", b(-390, -250, 170, 75, 75, 600).color(color));
p.part("tower-right", b(-390, 250, 170, 75, 75, 600).color(color));
p.part("counterweight", b(0, 0, 80, 400, 430, 350).color(color));
p.part("carriage", b(360, 0, 210, 260, 500, 180).color(color));
p.part("take-up-drum", hy(440, 0, 450, 540, 95, 10).color(color));
p.part("guardrail", b(-390, 0, 790, 820, 45, 45).color(color));

return p.model();
