// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "apiary-shade-canopy",
  license: 'CC0-1.0',
  title: "Apiary shade canopy",
  description: "Open four-post shade shelter with top frame, roof slats and cross braces. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8e856b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("apiary-shade-canopy");
p.part("post--400--300",b(-400,-300,0,55,55,1050).color(color));
p.part("post--400-300",b(-400,300,0,55,55,1050).color(color));
p.part("post-400--300",b(400,-300,0,55,55,1050).color(color));
p.part("post-400-300",b(400,300,0,55,55,1050).color(color));
p.part("beam-front",b(0,-300,1030,850,60,65).color(color));
p.part("beam-back",b(0,300,1030,850,60,65).color(color));
p.part("beam-left",b(-400,0,1030,60,650,65).color(color));
p.part("beam-right",b(400,0,1030,60,650,65).color(color));
p.part("roof-slat-0",b(-320,0,1100,55,650,35).color(color));
p.part("roof-slat-1",b(-160,0,1100,55,650,35).color(color));
p.part("roof-slat-2",b(0,0,1100,55,650,35).color(color));
p.part("roof-slat-3",b(160,0,1100,55,650,35).color(color));
p.part("roof-slat-4",b(320,0,1100,55,650,35).color(color));

return p.model();
