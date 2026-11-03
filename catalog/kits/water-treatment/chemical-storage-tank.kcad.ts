// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "chemical-storage-tank",
  license: 'CC0-1.0',
  title: "Chemical storage tank",
  description: "Vertical chemical storage tank with conical-look top, access hatch and containment curb. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7b8876", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("chemical-storage-tank");
p.part("containment",c(0,0,0,55,390,12).color(color));
p.part("tank",c(0,0,55,860,310,12).color(color));
p.part("roof",c(0,0,915,110,285,12).color(color));
p.part("hatch",c(0,0,1025,50,90,10).color(color));
p.part("level-strip",b(0,-315,250,45,20,420).color(color));
p.part("drain",b(0,0,40,120,120,70).color(color));

return p.model();
