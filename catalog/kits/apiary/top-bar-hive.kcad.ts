// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "top-bar-hive",
  license: 'CC0-1.0',
  title: "Top-bar hive",
  description: "Long low hive body with parallel top bars, end supports and a removable roof. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9a7949", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("top-bar-hive");
p.part("leg-left",b(-360,0,0,55,70,440).color(color));
p.part("leg-right",b(360,0,0,55,70,440).color(color));
p.part("body",b(0,0,440,1050,440,300).color(color));
p.part("landing",b(0,-250,420,1120,90,45).color(color));
p.part("top-bar-0",b(-420,0,740,45,455,35).color(color));
p.part("top-bar-1",b(-350,0,740,45,455,35).color(color));
p.part("top-bar-2",b(-280,0,740,45,455,35).color(color));
p.part("top-bar-3",b(-210,0,740,45,455,35).color(color));
p.part("top-bar-4",b(-140,0,740,45,455,35).color(color));
p.part("top-bar-5",b(-70,0,740,45,455,35).color(color));
p.part("top-bar-6",b(0,0,740,45,455,35).color(color));
p.part("top-bar-7",b(70,0,740,45,455,35).color(color));
p.part("top-bar-8",b(140,0,740,45,455,35).color(color));
p.part("top-bar-9",b(210,0,740,45,455,35).color(color));
p.part("top-bar-10",b(280,0,740,45,455,35).color(color));
p.part("top-bar-11",b(350,0,740,45,455,35).color(color));
p.part("top-bar-12",b(420,0,740,45,455,35).color(color));
p.part("roof",b(0,0,790,1140,520,70).color(color));

return p.model();
