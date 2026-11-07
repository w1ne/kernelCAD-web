// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "horizontal-split-case-pump",
  license: 'CC0-1.0',
  title: "Horizontal split case pump",
  description: "Horizontal pump casing with paired suction-discharge ports, base rails and motor coupling. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65706d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("horizontal-split-case-pump");
p.part("base",b(0,0,0,1050,450,50).color(color));
p.part("pump-case",c(-150,0,55,240,170,10).color(color));
p.part("suction",c(-150,-230,70,180,75,10).color(color));
p.part("discharge",c(-150,230,70,180,75,10).color(color));
p.part("motor",b(260,0,155,400,300,240).color(color));
p.part("coupling",c(70,0,160,120,38,10).color(color));
p.part("foot--380",b(-380,0,30,120,210,55).color(color));
p.part("foot-120",b(120,0,30,120,210,55).color(color));
p.part("foot-390",b(390,0,30,120,210,55).color(color));

return p.model();
