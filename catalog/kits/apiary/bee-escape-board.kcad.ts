// SPDX-License-Identifier: CC0-1.0
// Bee escape board: Flat escape-board frame with a center panel and four raised tunnel blocks. Separate hive timber, molded polymer surfaces clarify the parts.

meta({
  name: "bee-escape-board",
  license: 'CC0-1.0',
  title: "Bee escape board",
  description: "Flat escape-board frame with a center panel and four raised tunnel blocks. Material controls: timber, polymer. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });

presets({
  freshApiary: { timber: '#d4a462', polymer: '#d7e2d8' },
  weatheredYard: { timber: '#68543d', polymer: '#3f5d54' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("bee-escape-board");
p.part("board",b(0,0,25,620,500,35).color(timber));
p.part("rim-front",b(0,-245,0,650,25,70).color(timber));
p.part("rim-back",b(0,245,0,650,25,70).color(timber));
p.part("rim-left",b(-312,0,0,25,470,70).color(timber));
p.part("rim-right",b(312,0,0,25,470,70).color(timber));
p.part("escape-tunnel-0",b(-145,-110,60,130,100,90).color(polymer));
p.part("escape-tunnel-1",b(145,-110,60,130,100,90).color(polymer));
p.part("escape-tunnel-2",b(-145,110,60,130,100,90).color(polymer));
p.part("escape-tunnel-3",b(145,110,60,130,100,90).color(polymer));

return p.model();
