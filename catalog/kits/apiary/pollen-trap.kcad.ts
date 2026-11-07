// SPDX-License-Identifier: CC0-1.0
// Hive pollen trap: Entrance trap box with a removable drawer, comb grid and front landing board. Separate hive timber, stainless steel, molded polymer surfaces clarify the parts.

meta({
  name: "pollen-trap",
  license: 'CC0-1.0',
  title: "Hive pollen trap",
  description: "Entrance trap box with a removable drawer, comb grid and front landing board. Material controls: timber, stainless, polymer. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });

presets({
  freshApiary: { timber: '#d4a462', stainless: '#d9dfdc', polymer: '#d7e2d8' },
  weatheredYard: { timber: '#68543d', stainless: '#788482', polymer: '#3f5d54' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("pollen-trap");
p.part("trap-body",b(0,0,70,430,300,190).color(timber));
p.part("base",b(0,0,40,470,330,30).color(timber));
p.part("grid",b(0,-160,100,360,18,130).color(stainless));
p.part("grid-bar-0",b(-150,-174,100,12,15,130).color(stainless));
p.part("grid-bar-1",b(-100,-174,100,12,15,130).color(stainless));
p.part("grid-bar-2",b(-50,-174,100,12,15,130).color(stainless));
p.part("grid-bar-3",b(0,-174,100,12,15,130).color(stainless));
p.part("grid-bar-4",b(50,-174,100,12,15,130).color(stainless));
p.part("grid-bar-5",b(100,-174,100,12,15,130).color(stainless));
p.part("grid-bar-6",b(150,-174,100,12,15,130).color(stainless));
p.part("drawer",b(0,0,0,350,260,45).color(timber));
p.part("landing",b(0,-220,40,560,110,30).color(polymer));

return p.model();
