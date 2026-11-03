// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "bee-smoker",
  license: 'CC0-1.0',
  title: "Bee smoker",
  description: "Low-poly smoker with fire pot, perforated-look cap, spout and bellows body. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777a79", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("bee-smoker");
p.part("fire-pot",c(0,0,150,300,145,8).color(color));
p.part("base-ring",c(0,0,120,35,155,8).color(color));
p.part("cap",c(0,0,450,70,165,8).color(color));
p.part("spout",b(0,-130,330,110,230,70).color(color));
p.part("spout-tip",b(0,-310,330,150,50,45).color(color));
p.part("bellows-back",b(150,0,170,60,210,250).color(color));
p.part("bellows-front",b(220,0,170,35,180,210).color(color));
p.part("handle",b(0,0,0,190,140,55).color(color));

return p.model();
