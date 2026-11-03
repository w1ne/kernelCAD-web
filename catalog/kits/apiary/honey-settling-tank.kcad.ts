// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "honey-settling-tank",
  license: 'CC0-1.0',
  title: "Honey settling tank",
  description: "Tall settling vessel with domed-look lid, support feet and a lower drain valve. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9d8e67", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-settling-tank");
p.part("vessel",c(0,0,80,500,210,8).color(color));
p.part("base-ring",c(0,0,45,45,230,8).color(color));
p.part("lid",c(0,0,580,60,225,8).color(color));
p.part("lid-handle",c(0,0,640,70,28,8).color(color));
p.part("valve-body",b(0,-210,170,110,90,80).color(color));
p.part("valve-handle",c(0,-260,195,28,55,8).color(color));
p.part("foot-0",b(-150,-150,0,65,65,85).color(color));
p.part("foot-1",b(150,-150,0,65,65,85).color(color));
p.part("foot-2",b(-150,150,0,65,65,85).color(color));
p.part("foot-3",b(150,150,0,65,65,85).color(color));

return p.model();
