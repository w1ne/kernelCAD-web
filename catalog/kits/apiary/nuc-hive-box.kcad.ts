// SPDX-License-Identifier: CC0-1.0
// Nucleus hive box: Compact nucleus colony box with lid, handholds, entrance and bottom board. Separate hive timber, galvanized steel, molded polymer surfaces clarify the parts.

meta({
  name: "nuc-hive-box",
  license: 'CC0-1.0',
  title: "Nucleus hive box",
  description: "Compact nucleus colony box with lid, handholds, entrance and bottom board. Material controls: timber, steel, polymer. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const steel = param('steel', "#647176", { label: "Galvanized steel" });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });

presets({
  freshApiary: { timber: '#d4a462', steel: '#b7c0be', polymer: '#d7e2d8' },
  weatheredYard: { timber: '#68543d', steel: '#716d63', polymer: '#3f5d54' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("nuc-hive-box");
p.part("base",b(0,0,0,430,360,50).color(timber));
p.part("body",b(0,0,50,400,330,390).color(timber));
p.part("rim",b(0,0,440,430,360,35).color(timber));
p.part("lid",b(0,0,475,470,400,70).color(timber));
p.part("handle-left",b(-225,0,230,35,150,110).color(steel));
p.part("handle-right",b(225,0,230,35,150,110).color(steel));
p.part("entrance",b(0,-180,70,220,20,45).color(polymer));

return p.model();
