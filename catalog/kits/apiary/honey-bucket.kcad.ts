// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "honey-bucket",
  license: 'CC0-1.0',
  title: "Honey pail",
  description: "Straight sided honey pail with lid, rim, bail handle and small bottom feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a28d5e", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-bucket");
p.part("pail",c(0,0,35,280,140,8).color(color));
p.part("bottom",c(0,0,0,35,145,8).color(color));
p.part("lid",c(0,0,315,35,150,8).color(color));
p.part("lid-knob",c(0,0,350,35,25,8).color(color));
p.part("bail",b(0,0,390,300,28,18).color(color));
p.part("foot-0",b(-95,-95,0,45,45,35).color(color));
p.part("foot-1",b(95,-95,0,45,45,35).color(color));
p.part("foot-2",b(-95,95,0,45,45,35).color(color));
p.part("foot-3",b(95,95,0,45,45,35).color(color));

return p.model();
