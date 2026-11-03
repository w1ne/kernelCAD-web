// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "apiary-waterer",
  license: 'CC0-1.0',
  title: "Apiary waterer",
  description: "Shallow water tray with raised reservoir, support ring and landing rim. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#899084", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("apiary-waterer");
p.part("tray",c(0,0,0,65,200,8).color(color));
p.part("reservoir",c(0,0,65,280,95,8).color(color));
p.part("neck",c(0,0,345,45,110,8).color(color));
p.part("cap",c(0,0,390,35,120,8).color(color));
p.part("landing-front",b(0,-210,20,420,80,30).color(color));
p.part("landing-back",b(0,210,20,420,80,30).color(color));

return p.model();
