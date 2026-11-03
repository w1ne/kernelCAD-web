// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "frame-grip",
  license: 'CC0-1.0',
  title: "Frame grip",
  description: "Hand tool with paired clamping jaws, pivot block and long grip handles. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7e7060", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("frame-grip");
p.part("jaw-left",b(-70,0,250,28,220,260).color(color));
p.part("jaw-right",b(70,0,250,28,220,260).color(color));
p.part("pivot",c(0,0,190,55,52,8).color(color));
p.part("handle-left",b(-110,0,80,34,45,160).color(color));
p.part("handle-right",b(110,0,80,34,45,160).color(color));
p.part("grip-left",b(-150,0,0,50,70,90).color(color));
p.part("grip-right",b(150,0,0,50,70,90).color(color));

return p.model();
