// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "honey-strainer",
  license: 'CC0-1.0',
  title: "Honey strainer",
  description: "Stacking filter basket with broad rim, lower tapered-look body and support tabs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#858d8b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-strainer");
p.part("basket",c(0,0,0,180,170,8).color(color));
p.part("rim",c(0,0,180,35,195,8).color(color));
p.part("screen-bar-0",b(-120,0,10,8,250,150).color(color));
p.part("screen-bar-1",b(-80,0,10,8,250,150).color(color));
p.part("screen-bar-2",b(-40,0,10,8,250,150).color(color));
p.part("screen-bar-3",b(0,0,10,8,250,150).color(color));
p.part("screen-bar-4",b(40,0,10,8,250,150).color(color));
p.part("screen-bar-5",b(80,0,10,8,250,150).color(color));
p.part("screen-bar-6",b(120,0,10,8,250,150).color(color));
p.part("tab-left",b(-210,0,180,85,55,25).color(color));
p.part("tab-right",b(210,0,180,85,55,25).color(color));

return p.model();
