// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "aeration-header-bridge",
  license: 'CC0-1.0',
  title: "Aeration header bridge",
  description: "Raised process-air bridge with twin pipe rails, cross supports and access steps. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#606d6c", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("aeration-header-bridge");
p.part("walkway",b(0,0,380,1100,260,55).color(color));
p.part("post--470",b(-470,0,0,55,65,380).color(color));
p.part("post-470",b(470,0,0,55,65,380).color(color));
p.part("rail-front",b(0,-120,470,1000,35,35).color(color));
p.part("rail-back",b(0,120,470,1000,35,35).color(color));
p.part("header-a",c(0,-55,240,130,42,10).color(color));
p.part("header-b",c(0,55,240,130,42,10).color(color));
p.part("step-0",b(-570,0,10,250,200,45).color(color));
p.part("step-1",b(-570,0,110,250,200,45).color(color));
p.part("step-2",b(-570,0,210,250,200,45).color(color));

return p.model();
