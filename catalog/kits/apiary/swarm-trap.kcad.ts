// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "swarm-trap",
  license: 'CC0-1.0',
  title: "Swarm trap box",
  description: "Tall bait-hive box with rain cover, entrance landing and hanging brackets. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9c8155", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("swarm-trap");
p.part("body",b(0,0,30,380,330,650).color(color));
p.part("base",b(0,0,0,420,370,60).color(color));
p.part("roof",b(0,0,680,460,410,75).color(color));
p.part("entrance",b(0,-170,70,160,25,60).color(color));
p.part("landing",b(0,-215,30,250,110,35).color(color));
p.part("hanger-left",b(-130,0,755,45,45,110).color(color));
p.part("hanger-right",b(130,0,755,45,45,110).color(color));

return p.model();
