// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "underground-shuttle-car",
  license: 'CC0-1.0',
  title: "Underground shuttle car",
  description: "Low ore shuttle with a deep haul body, operator enclosure, front bumper, and wheel guards. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b17a38", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("underground-shuttle-car");
p.part("chassis", b(0, 0, 65, 1150, 460, 130).color(color));
p.part("ore-body", b(-70, 0, 180, 760, 430, 380).color(color));
p.part("body-rim", b(-70, 0, 560, 800, 470, 45).color(color));
p.part("operator-cab", b(470, 0, 160, 260, 340, 360).color(color));
p.part("cab-roof", b(470, 0, 520, 300, 380, 50).color(color));
p.part("front-wheel-set", c(385, 0, 0, 90, 175, 8).color(color));
p.part("rear-wheel-set", c(-405, 0, 0, 90, 175, 8).color(color));
p.part("front-bumper", b(650, 0, 95, 70, 520, 110).color(color));

return p.model();
