// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "backwash-pump-skid",
  license: 'CC0-1.0',
  title: "Filter backwash pump skid",
  description: "Twin backwash pump set on a shared base with suction headers and motor blocks. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#697773", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("backwash-pump-skid");
p.part("base",b(0,0,0,1250,560,50).color(color));
p.part("pump-a",c(-320,0,50,250,120,10).color(color));
p.part("pump-b",c(320,0,50,250,120,10).color(color));
p.part("motor-a",b(-320,0,205,320,240,180).color(color));
p.part("motor-b",b(320,0,205,320,240,180).color(color));
p.part("suction-header",c(0,-230,255,850,42,10).color(color));
p.part("discharge-header",c(0,230,255,850,42,10).color(color));
p.part("foot--420",b(-420,0,25,85,120,60).color(color));
p.part("foot-420",b(420,0,25,85,120,60).color(color));

return p.model();
