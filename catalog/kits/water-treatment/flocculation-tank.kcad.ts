// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "flocculation-tank",
  license: 'CC0-1.0',
  title: "Flocculation tank",
  description: "Open flocculation tank with raised rim, central mixer shaft and three paddle arms. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6f817a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("flocculation-tank");
p.part("tank",c(0,0,0,470,460,12).color(color));
p.part("rim",c(0,0,455,65,490,12).color(color));
p.part("shaft",c(0,0,500,450,35,10).color(color));
p.part("mixer-arm-a",b(0,0,620,650,45,45).color(color));
p.part("mixer-arm-b",b(0,0,490,520,45,45).color(color));
p.part("paddle-a",b(-290,0,480,75,85,180).color(color));
p.part("paddle-b",b(290,0,480,75,85,180).color(color));
p.part("motor",b(0,0,950,200,180,140).color(color));

return p.model();
