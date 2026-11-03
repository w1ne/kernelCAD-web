// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "grit-classifier",
  license: 'CC0-1.0',
  title: "Grit classifier unit",
  description: "Compact grit classifier with sloped trough, feed hopper, discharge chute and support legs. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777b75", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("grit-classifier");
p.part("trough",b(0,0,140,850,330,180).color(color));
p.part("feed-hopper",b(-260,0,370,340,360,300).color(color));
p.part("discharge",b(390,0,50,260,260,250).color(color));
p.part("leg--330",b(-330,0,0,65,70,150).color(color));
p.part("leg-330",b(330,0,0,65,70,150).color(color));
p.part("drive",c(220,0,310,170,85,10).color(color));

return p.model();
