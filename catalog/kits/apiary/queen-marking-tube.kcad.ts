// SPDX-License-Identifier: CC0-1.0
// Queen marking tube: Vertical queen-marking tube with padded base cup and sliding plunger handle. Separate tinted glass, molded polymer, rubber surfaces clarify the parts.

meta({
  name: "queen-marking-tube",
  license: 'CC0-1.0',
  title: "Queen marking tube",
  description: "Vertical queen-marking tube with padded base cup and sliding plunger handle. Material controls: glass, polymer, rubber. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const glass = param('glass', "#9ac1bd", { label: "Tinted glass" });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });
const rubber = param('rubber', "#333a3b", { label: "Rubber" });

presets({
  freshApiary: { glass: '#c9dfd8', polymer: '#d7e2d8', rubber: '#485152' },
  weatheredYard: { glass: '#6e9392', polymer: '#3f5d54', rubber: '#252b2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("queen-marking-tube");
p.part("tube",c(0,0,50,240,70,8).color(glass));
p.part("base-cup",c(0,0,0,60,85,8).color(polymer));
p.part("plunger-rod",b(0,0,290,24,24,100).color(polymer));
p.part("plunger-handle",b(0,0,390,100,70,30).color(rubber));
p.part("top-rim",c(0,0,280,25,80,8).color(glass));

return p.model();
