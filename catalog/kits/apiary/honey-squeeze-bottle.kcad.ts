// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "honey-squeeze-bottle",
  license: 'CC0-1.0',
  title: "Honey squeeze bottle",
  description: "Soft sided bottle form with tapered shoulder, narrow nozzle and cap. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b2934e", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-squeeze-bottle");
p.part("body",c(0,0,0,230,80,8).color(color));
p.part("shoulder",c(0,0,230,60,65,8).color(color));
p.part("neck",c(0,0,290,75,38,8).color(color));
p.part("nozzle",c(0,0,365,85,20,8).color(color));
p.part("cap",c(0,0,450,40,30,8).color(color));
p.part("label",b(0,-80,90,85,12,80).color(color));

return p.model();
