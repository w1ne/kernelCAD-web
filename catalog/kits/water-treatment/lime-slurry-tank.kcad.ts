// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "lime-slurry-tank",
  license: 'CC0-1.0',
  title: "Lime slurry mix tank",
  description: "Open mix tank with top rim, agitator motor, central shaft and two mixing paddles. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#888478", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("lime-slurry-tank");
p.part("tank",c(0,0,0,540,300,12).color(color));
p.part("rim",c(0,0,520,65,330,12).color(color));
p.part("shaft",c(0,0,585,430,32,10).color(color));
p.part("motor",b(0,0,1015,180,160,120).color(color));
p.part("paddle-a",b(0,0,740,420,38,35).color(color));
p.part("paddle-b",b(0,0,850,320,38,35).color(color));
p.part("outlet",b(0,300,110,160,110,85).color(color));

return p.model();
