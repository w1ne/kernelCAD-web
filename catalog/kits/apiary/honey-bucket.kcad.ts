// SPDX-License-Identifier: CC0-1.0
// Honey pail: Straight sided honey pail with lid, rim, bail handle and small bottom feet. Separate molded polymer, stainless steel surfaces clarify the parts.

meta({
  name: "honey-bucket",
  license: 'CC0-1.0',
  title: "Honey pail",
  description: "Straight sided honey pail with lid, rim, bail handle and small bottom feet. Material controls: polymer, stainless. Presets: brightStainless and warmHarvest.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });

presets({
  brightStainless: { polymer: '#d7e2d8', stainless: '#d9dfdc' },
  warmHarvest: { polymer: '#3f5d54', stainless: '#788482' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-bucket");
p.part("pail",c(0,0,35,280,140,8).color(polymer));
p.part("bottom",c(0,0,0,35,145,8).color(polymer));
p.part("lid",c(0,0,315,35,150,8).color(polymer));
p.part("lid-knob",c(0,0,350,35,25,8).color(polymer));
p.part("bail",b(0,0,390,300,28,18).color(stainless));
p.part("foot-0",b(-95,-95,0,45,45,35).color(polymer));
p.part("foot-1",b(95,-95,0,45,45,35).color(polymer));
p.part("foot-2",b(-95,95,0,45,45,35).color(polymer));
p.part("foot-3",b(95,95,0,45,45,35).color(polymer));

return p.model();
