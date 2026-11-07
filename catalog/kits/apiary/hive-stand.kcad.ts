// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hive-stand",
  license: 'CC0-1.0',
  title: "Hive stand",
  description: "Raised hive support with four feet, paired rails and a broad landing deck. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77705f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-stand");
p.part("leg--250--180",b(-250,-180,0,70,70,300).color(color));
p.part("leg--250-180",b(-250,180,0,70,70,300).color(color));
p.part("leg-250--180",b(250,-180,0,70,70,300).color(color));
p.part("leg-250-180",b(250,180,0,70,70,300).color(color));
p.part("rail-front",b(0,-180,250,570,70,70).color(color));
p.part("rail-back",b(0,180,250,570,70,70).color(color));
p.part("cross-rail-left",b(-250,0,250,70,430,70).color(color));
p.part("cross-rail-right",b(250,0,250,70,430,70).color(color));
p.part("deck",b(0,0,320,700,520,55).color(color));

return p.model();
