// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mill-relining-machine",
  license: 'CC0-1.0',
  title: "Mill relining machine",
  description: "Service platform and hydraulic liner handler with low chassis, lift mast, boom, and guarded operator station. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b28a45", { label: 'Asset color' });
const baseZ=20;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("mill-relining-machine");
p.part("chassis", b(0, 0, 40, 920, 560, 120).color(color));
p.part("left-wheel", b(-280, -320, 20, 230, 90, 170).color(color));
p.part("right-wheel", b(-280, 320, 20, 230, 90, 170).color(color));
p.part("operator-cab", b(-300, 0, 160, 260, 330, 290).color(color));
p.part("cab-roof", b(-300, 0, 450, 300, 370, 45).color(color));
p.part("lift-mast", b(220, 0, 155, 180, 190, 620).color(color));
p.part("handler-boom", b(510, 0, 650, 440, 160, 120).color(color));
p.part("tool-head", c(750, 0, 590, 150, 105, 10).color(color));
p.part("counterweight", b(-470, 0, 80, 220, 420, 180).color(color));

return p.model();
