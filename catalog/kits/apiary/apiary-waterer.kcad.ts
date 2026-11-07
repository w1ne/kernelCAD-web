// SPDX-License-Identifier: CC0-1.0
// Apiary waterer: Shallow water tray with raised reservoir, support ring and landing rim. Separate molded polymer, tinted glass, stainless steel surfaces clarify the parts.

meta({
  name: "apiary-waterer",
  license: 'CC0-1.0',
  title: "Apiary waterer",
  description: "Shallow water tray with raised reservoir, support ring and landing rim. Material controls: polymer, glass, stainless. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });
const glass = param('glass', "#9ac1bd", { label: "Tinted glass" });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });

presets({
  freshApiary: { polymer: '#d7e2d8', glass: '#c9dfd8', stainless: '#d9dfdc' },
  weatheredYard: { polymer: '#3f5d54', glass: '#6e9392', stainless: '#788482' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("apiary-waterer");
p.part("tray",c(0,0,0,65,200,8).color(polymer));
p.part("reservoir",c(0,0,65,280,95,8).color(glass));
p.part("neck",c(0,0,345,45,110,8).color(polymer));
p.part("cap",c(0,0,390,35,120,8).color(polymer));
p.part("landing-front",b(0,-210,20,420,80,30).color(polymer));
p.part("landing-back",b(0,210,20,420,80,30).color(polymer));


p.part("mount-left",b(-130,-205,25,32,28,60).color(stainless));
p.part("mount-right",b(130,-205,25,32,28,60).color(stainless));

return p.model();
