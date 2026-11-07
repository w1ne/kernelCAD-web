// SPDX-License-Identifier: CC0-1.0
// Honey settling tank: Tall settling vessel with domed-look lid, support feet and a lower drain valve. Separate stainless steel, tinted glass, rubber surfaces clarify the parts.

meta({
  name: "honey-settling-tank",
  license: 'CC0-1.0',
  title: "Honey settling tank",
  description: "Tall settling vessel with domed-look lid, support feet and a lower drain valve. Material controls: stainless, glass, rubber. Presets: brightStainless and warmHarvest.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const glass = param('glass', "#9ac1bd", { label: "Tinted glass" });
const rubber = param('rubber', "#333a3b", { label: "Rubber" });

presets({
  brightStainless: { stainless: '#d9dfdc', glass: '#c9dfd8', rubber: '#485152' },
  warmHarvest: { stainless: '#788482', glass: '#6e9392', rubber: '#252b2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-settling-tank");
p.part("vessel",c(0,0,80,500,210,8).color(stainless));
p.part("base-ring",c(0,0,45,45,230,8).color(stainless));
p.part("lid",c(0,0,580,60,225,8).color(stainless));
p.part("lid-handle",c(0,0,640,70,28,8).color(stainless));
p.part("valve-body",b(0,-210,170,110,90,80).color(stainless));
p.part("valve-handle",c(0,-260,195,28,55,8).color(stainless));
p.part("foot-0",b(-150,-150,0,65,65,85).color(rubber));
p.part("foot-1",b(150,-150,0,65,65,85).color(rubber));
p.part("foot-2",b(-150,150,0,65,65,85).color(rubber));
p.part("foot-3",b(150,150,0,65,65,85).color(rubber));


p.part("sight-glass",c(110,-212,170,240,18,8).color(glass));

return p.model();
