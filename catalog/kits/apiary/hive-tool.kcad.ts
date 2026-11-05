// SPDX-License-Identifier: CC0-1.0
// Hive tool: Compact flat hive tool with a broad scraper end and raised pry hook. Separate stainless steel, rubber surfaces clarify the parts.

meta({
  name: "hive-tool",
  license: 'CC0-1.0',
  title: "Hive tool",
  description: "Compact flat hive tool with a broad scraper end and raised pry hook. Material controls: stainless, rubber. Presets: freshApiary and weatheredYard.",
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

const p=assembly("hive-tool");
p.part("shaft",b(0,0,45,55,40,300).color(stainless));
p.part("scraper",b(0,0,345,210,48,45).color(stainless));
p.part("hook-base",b(0,0,45,110,55,45).color(stainless));
p.part("hook-tip",b(35,0,0,45,55,110).color(stainless));
p.part("grip-rib-a",b(0,28,115,65,15,30).color(rubber));
p.part("grip-rib-b",b(0,28,190,65,15,30).color(rubber));

return p.model();
