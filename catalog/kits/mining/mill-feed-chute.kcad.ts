// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mill-feed-chute",
  license: 'CC0-1.0',
  title: "Mill feed chute",
  description: "Wear-lined transfer chute with feed collar, sloped body panels, support saddle, and inspection hatch. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#736f61", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("mill-feed-chute");
p.part("top-collar", b(0, 0, 620, 600, 580, 70).color(color));
p.part("front-panel", b(0, -230, 340, 550, 60, 520).color(color));
p.part("rear-panel", b(0, 230, 340, 550, 60, 520).color(color));
p.part("left-panel", b(-245, 0, 340, 60, 400, 520).color(color));
p.part("right-panel", b(245, 0, 340, 60, 400, 520).color(color));
p.part("outlet-neck", b(0, 0, 75, 360, 340, 180).color(color));
p.part("saddle-left", b(-330, 0, 0, 75, 520, 240).color(color));
p.part("saddle-right", b(330, 0, 0, 75, 520, 240).color(color));
p.part("inspection-hatch", b(0, -270, 420, 220, 30, 170).color(color));
p.part("access-boss", c(0, -300, 500, 70, 68, 8).color(color));

return p.model();
