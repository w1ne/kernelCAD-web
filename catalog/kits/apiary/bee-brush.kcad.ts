// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "bee-brush",
  license: 'CC0-1.0',
  title: "Bee brush",
  description: "Long-handled frame brush with a broad ferrule and a compact bristle block. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9b815c", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("bee-brush");
p.part("handle",b(0,0,0,45,55,300).color(color));
p.part("ferrule",b(0,0,300,110,60,45).color(color));
p.part("bristles",b(0,0,345,145,95,42).color(color));
p.part("bristle-0",b(-55,0,385,8,78,35).color(color));
p.part("bristle-1",b(-33,0,385,8,78,35).color(color));
p.part("bristle-2",b(-11,0,385,8,78,35).color(color));
p.part("bristle-3",b(11,0,385,8,78,35).color(color));
p.part("bristle-4",b(33,0,385,8,78,35).color(color));
p.part("bristle-5",b(55,0,385,8,78,35).color(color));

return p.model();
