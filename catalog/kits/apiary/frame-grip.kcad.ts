// SPDX-License-Identifier: CC0-1.0
// Frame grip: Hand tool with paired clamping jaws, pivot block and long grip handles. Separate stainless steel, rubber surfaces clarify the parts.

meta({
  name: "frame-grip",
  license: 'CC0-1.0',
  title: "Frame grip",
  description: "Hand tool with paired clamping jaws, pivot block and long grip handles. Material controls: stainless, rubber. Presets: freshApiary and weatheredYard.",
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

const p=assembly("frame-grip");
p.part("jaw-left",b(-70,0,240,28,220,260).color(stainless));
p.part("jaw-right",b(70,0,240,28,220,260).color(stainless));
p.part("pivot",c(0,0,190,55,62,8).color(stainless));
p.part("handle-left",b(-75,0,120,34,45,130).color(stainless));
p.part("handle-right",b(75,0,120,34,45,130).color(stainless));
p.part("grip-left",b(-100,0,0,50,70,130).color(rubber));
p.part("grip-right",b(100,0,0,50,70,130).color(rubber));

return p.model();
