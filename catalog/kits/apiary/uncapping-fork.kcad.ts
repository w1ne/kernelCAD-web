// SPDX-License-Identifier: CC0-1.0
// Uncapping fork: Hand uncapping fork with a grip, narrow neck and row of short tines. Separate stainless steel, hive timber surfaces clarify the parts.

meta({
  name: "uncapping-fork",
  license: 'CC0-1.0',
  title: "Uncapping fork",
  description: "Hand uncapping fork with a grip, narrow neck and row of short tines. Material controls: stainless, timber. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const timber = param('timber', "#b8874a", { label: "Hive timber" });

presets({
  freshApiary: { stainless: '#d9dfdc', timber: '#d4a462' },
  weatheredYard: { stainless: '#788482', timber: '#68543d' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("uncapping-fork");
p.part("handle",b(0,0,0,70,65,240).color(timber));
p.part("neck",b(0,0,240,40,35,115).color(stainless));
p.part("head",b(0,0,355,230,40,30).color(stainless));
p.part("tine-0",b(-95,0,385,10,22,92).color(stainless));
p.part("tine-1",b(-71,0,385,10,22,92).color(stainless));
p.part("tine-2",b(-47,0,385,10,22,92).color(stainless));
p.part("tine-3",b(-23,0,385,10,22,92).color(stainless));
p.part("tine-4",b(1,0,385,10,22,92).color(stainless));
p.part("tine-5",b(25,0,385,10,22,92).color(stainless));
p.part("tine-6",b(49,0,385,10,22,92).color(stainless));
p.part("tine-7",b(73,0,385,10,22,92).color(stainless));
p.part("tine-8",b(97,0,385,10,22,92).color(stainless));

return p.model();
