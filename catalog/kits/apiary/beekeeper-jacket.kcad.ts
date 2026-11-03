// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "beekeeper-jacket",
  license: 'CC0-1.0',
  title: "Beekeeper jacket",
  description: "Protective jacket form with torso, sleeves, collar and integrated hood ring. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d7d1be", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("beekeeper-jacket");
p.part("torso",b(0,0,260,480,250,570).color(color));
p.part("sleeve-left",b(-300,0,280,140,170,500).color(color));
p.part("sleeve-right",b(300,0,280,140,170,500).color(color));
p.part("cuff-left",b(-300,0,0,155,185,50).color(color));
p.part("cuff-right",b(300,0,0,155,185,50).color(color));
p.part("collar",b(0,-5,540,210,200,60).color(color));
p.part("hood-rim",c(0,0,600,40,145,8).color(color));

return p.model();
