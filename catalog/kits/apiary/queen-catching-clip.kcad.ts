// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "queen-catching-clip",
  license: 'CC0-1.0',
  title: "Queen catching clip",
  description: "Lightweight queen-catching clip with two long arms, hinge and rounded tips. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9d916f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("queen-catching-clip");
p.part("arm-left",b(-75,0,100,28,36,240).color(color));
p.part("arm-right",b(75,0,100,28,36,240).color(color));
p.part("hinge",c(0,0,80,50,45,8).color(color));
p.part("handle-left",b(-75,0,0,55,45,75).color(color));
p.part("handle-right",b(75,0,0,55,45,75).color(color));
p.part("tip-left",b(-75,0,330,55,55,35).color(color));
p.part("tip-right",b(75,0,330,55,55,35).color(color));

return p.model();
