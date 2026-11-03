// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "cable-entry-boot",
  license: 'CC0-1.0',
  title: "Cable entry boot",
  description: "Flexible-looking cable entry boot with base plate, raised collar and short conduit riser. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#575f5d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("cable-entry-boot");
p.part("plate",b(0,0,0,460,380,50).color(color));
p.part("boot",c(0,0,25,160,140,8).color(color));
p.part("collar",c(0,0,185,60,115,8).color(color));
p.part("conduit",c(0,0,245,370,50,8).color(color));
p.part("cap",c(0,0,615,35,66,8).color(color));

return p.model();
