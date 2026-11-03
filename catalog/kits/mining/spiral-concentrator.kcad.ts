// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "spiral-concentrator",
  license: 'CC0-1.0',
  title: "Spiral concentrator bank",
  description: "Gravity separation bank with support column, stacked spiral trays, feed box, and concentrate launders. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#697c77", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("spiral-concentrator");
p.part("base-skid", b(0, 0, 0, 860, 650, 70).color(color));
p.part("central-column", c(0, 0, 70, 1040, 65, 10).color(color));
p.part("spiral-tray-0", b(0, 0, 150, 700, 510, 35).color(color));
p.part("spiral-tray-1", b(0, 0, 305, 668, 490, 35).color(color));
p.part("spiral-tray-2", b(0, 0, 460, 636, 470, 35).color(color));
p.part("spiral-tray-3", b(0, 0, 615, 604, 450, 35).color(color));
p.part("spiral-tray-4", b(0, 0, 770, 572, 430, 35).color(color));
p.part("spiral-tray-5", b(0, 0, 925, 540, 410, 35).color(color));
p.part("feed-box", b(-350, 0, 970, 220, 230, 200).color(color));
p.part("concentrate-launder", b(360, 0, 75, 160, 620, 80).color(color));
p.part("product-spout-a", c(370, -280, 75, 140, 50, 8).color(color));
p.part("product-spout-b", c(370, 280, 75, 140, 50, 8).color(color));

return p.model();
