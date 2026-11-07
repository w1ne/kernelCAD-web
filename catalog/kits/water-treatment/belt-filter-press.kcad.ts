// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "belt-filter-press",
  license: 'CC0-1.0',
  title: "Belt filter press",
  description: "Compact belt press with paired roller banks, side frame plates and collection pan. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626d68", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("belt-filter-press");
p.part("base",b(0,0,0,1100,560,50).color(color));
p.part("roller-0",c(-360,0,235,120,75,10).color(color));
p.part("roller-1",c(-120,0,235,120,75,10).color(color));
p.part("roller-2",c(120,0,235,120,75,10).color(color));
p.part("roller-3",c(360,0,235,120,75,10).color(color));
p.part("frame-left",b(0,-240,275,1000,45,570).color(color));
p.part("frame-right",b(0,240,275,1000,45,570).color(color));
p.part("collection-pan",b(0,0,65,850,470,55).color(color));
p.part("upper-beam",b(0,0,575,900,55,55).color(color));

return p.model();
