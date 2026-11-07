// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "aeration-basin",
  license: 'CC0-1.0',
  title: "Aeration basin",
  description: "Rectangular aeration basin with divider wall, two pipe headers and service walkway. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#72817b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("aeration-basin");
p.part("basin-floor",b(0,0,0,1500,950,40).color(color));
p.part("wall-front",b(0,-450,20,1500,55,450).color(color));
p.part("wall-back",b(0,450,20,1500,55,450).color(color));
p.part("divider",b(0,0,20,60,850,400).color(color));
p.part("walkway",b(0,0,480,1500,180,60).color(color));
p.part("header-left",c(-420,0,440,760,55,10).color(color));
p.part("header-right",c(420,0,440,760,55,10).color(color));

return p.model();
