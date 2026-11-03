// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "honey-jar",
  license: 'CC0-1.0',
  title: "Honey jar",
  description: "Simple straight sided jar with a shoulder rim, screw lid and small label panel. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#ab945b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-jar");
p.part("jar-body",c(0,0,0,220,75,8).color(color));
p.part("shoulder",c(0,0,220,45,60,8).color(color));
p.part("neck",c(0,0,265,70,45,8).color(color));
p.part("lid",c(0,0,335,45,55,8).color(color));
p.part("label",b(0,-73,85,95,10,80).color(color));

return p.model();
