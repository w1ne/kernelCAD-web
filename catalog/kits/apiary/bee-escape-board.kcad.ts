// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "bee-escape-board",
  license: 'CC0-1.0',
  title: "Bee escape board",
  description: "Flat escape-board frame with a center panel and four raised tunnel blocks. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#918064", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("bee-escape-board");
p.part("board",b(0,0,25,620,500,35).color(color));
p.part("rim-front",b(0,-245,0,650,25,70).color(color));
p.part("rim-back",b(0,245,0,650,25,70).color(color));
p.part("rim-left",b(-312,0,0,25,470,70).color(color));
p.part("rim-right",b(312,0,0,25,470,70).color(color));
p.part("escape-tunnel-0",b(-145,-110,60,130,100,90).color(color));
p.part("escape-tunnel-1",b(145,-110,60,130,100,90).color(color));
p.part("escape-tunnel-2",b(-145,110,60,130,100,90).color(color));
p.part("escape-tunnel-3",b(145,110,60,130,100,90).color(color));

return p.model();
