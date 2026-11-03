// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "roof-bolting-rig",
  license: 'CC0-1.0',
  title: "Underground roof-bolting rig",
  description: "Compact bolting vehicle with protected cab, tracked base, feed mast, and paired drill heads. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d3a64c", { label: 'Asset color' });
const baseZ=35;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("roof-bolting-rig");
p.part("left-track", b(-80, -230, 35, 760, 135, 90).color(color));
p.part("right-track", b(-80, 230, 35, 760, 135, 90).color(color));
p.part("chassis", b(-60, 0, 120, 780, 390, 170).color(color));
p.part("cab", b(-300, 0, 290, 300, 330, 300).color(color));
p.part("cab-roof", b(-300, 0, 590, 340, 370, 50).color(color));
p.part("feed-mast", b(300, 0, 285, 130, 150, 510).color(color));
p.part("drill-head-left", c(280, -125, 690, 125, 48, 8).color(color));
p.part("drill-head-right", c(280, 125, 690, 125, 48, 8).color(color));

return p.model();
