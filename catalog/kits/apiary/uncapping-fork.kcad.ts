// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "uncapping-fork",
  license: 'CC0-1.0',
  title: "Uncapping fork",
  description: "Hand uncapping fork with a grip, narrow neck and row of short tines. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9b8b70", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("uncapping-fork");
p.part("handle",b(0,0,0,70,65,240).color(color));
p.part("neck",b(0,0,240,40,35,115).color(color));
p.part("head",b(0,0,355,230,40,30).color(color));
p.part("tine-0",b(-95,0,385,10,22,92).color(color));
p.part("tine-1",b(-71,0,385,10,22,92).color(color));
p.part("tine-2",b(-47,0,385,10,22,92).color(color));
p.part("tine-3",b(-23,0,385,10,22,92).color(color));
p.part("tine-4",b(1,0,385,10,22,92).color(color));
p.part("tine-5",b(25,0,385,10,22,92).color(color));
p.part("tine-6",b(49,0,385,10,22,92).color(color));
p.part("tine-7",b(73,0,385,10,22,92).color(color));
p.part("tine-8",b(97,0,385,10,22,92).color(color));

return p.model();
