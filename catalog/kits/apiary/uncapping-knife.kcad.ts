// SPDX-License-Identifier: CC0-1.0
// Uncapping knife: Long straight uncapping blade with broad handle and a small guard collar. Separate stainless steel, hive timber, rubber surfaces clarify the parts.

meta({
  name: "uncapping-knife",
  license: 'CC0-1.0',
  title: "Uncapping knife",
  description: "Long straight uncapping blade with broad handle and a small guard collar. Material controls: stainless, timber, rubber. Presets: freshApiary and weatheredYard.",
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
const rubber = param('rubber', "#333a3b", { label: "Rubber" });

presets({
  freshApiary: { stainless: '#d9dfdc', timber: '#d4a462', rubber: '#485152' },
  weatheredYard: { stainless: '#788482', timber: '#68543d', rubber: '#252b2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("uncapping-knife");
p.part("blade",b(0,0,250,40,18,290).color(stainless));
p.part("blade-tip",b(0,0,520,40,18,45).color(stainless));
p.part("guard",b(0,0,230,100,55,25).color(rubber));
p.part("handle",b(0,0,20,70,65,210).color(timber));
p.part("pommel",b(0,0,0,85,75,30).color(stainless));

return p.model();
