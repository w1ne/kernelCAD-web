// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "pressure-sand-filter-vessel",
  license: 'CC0-1.0',
  title: "Pressure sand filter vessel",
  description: "Vertical pressure vessel with domed-look end caps, inspection manway and side pipe nozzles. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7975", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("pressure-sand-filter-vessel");
p.part("shell",c(0,0,60,950,310,12).color(color));
p.part("top-head",c(0,0,1010,90,285,12).color(color));
p.part("bottom-head",c(0,0,0,80,285,12).color(color));
p.part("manway",b(0,-305,570,190,45,190).color(color));
p.part("inlet",c(0,-390,280,100,70,10).color(color));
p.part("outlet",c(0,390,280,100,70,10).color(color));
p.part("foot--190",b(-190,0,0,100,130,70).color(color));
p.part("foot-190",b(190,0,0,100,130,70).color(color));

return p.model();
