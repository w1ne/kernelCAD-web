// SPDX-License-Identifier: CC0-1.0
// Queen catching clip: Lightweight queen-catching clip with two long arms, hinge and rounded tips. Separate stainless steel, rubber surfaces clarify the parts.

meta({
  name: "queen-catching-clip",
  license: 'CC0-1.0',
  title: "Queen catching clip",
  description: "Lightweight queen-catching clip with two long arms, hinge and rounded tips. Material controls: stainless, rubber. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const rubber = param('rubber', "#333a3b", { label: "Rubber" });

presets({
  freshApiary: { stainless: '#d9dfdc', rubber: '#485152' },
  weatheredYard: { stainless: '#788482', rubber: '#252b2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("queen-catching-clip");
p.part("arm-left",b(-75,0,100,28,36,240).color(stainless));
p.part("arm-right",b(75,0,100,28,36,240).color(stainless));
p.part("hinge",c(0,0,80,50,45,8).color(stainless));
p.part("handle-left",b(-75,0,0,55,45,75).color(rubber));
p.part("handle-right",b(75,0,0,55,45,75).color(rubber));
p.part("tip-left",b(-75,0,330,55,55,35).color(stainless));
p.part("tip-right",b(75,0,330,55,55,35).color(stainless));

return p.model();
