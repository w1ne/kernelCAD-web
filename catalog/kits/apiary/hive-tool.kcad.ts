// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hive-tool",
  license: 'CC0-1.0',
  title: "Hive tool",
  description: "Compact flat hive tool with a broad scraper end and raised pry hook. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777b7d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-tool");
p.part("shaft",b(0,0,45,55,40,300).color(color));
p.part("scraper",b(0,0,345,210,48,45).color(color));
p.part("hook-base",b(0,0,45,110,55,45).color(color));
p.part("hook-tip",b(35,0,0,45,55,110).color(color));
p.part("grip-rib-a",b(0,28,115,65,15,30).color(color));
p.part("grip-rib-b",b(0,28,190,65,15,30).color(color));

return p.model();
