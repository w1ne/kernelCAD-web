// SPDX-License-Identifier: CC0-1.0
// Migratory hive cover: Flat transport cover with overhanging rim, center ribs and lift tabs. Separate hive timber, galvanized steel surfaces clarify the parts.

meta({
  name: "migratory-hive-cover",
  license: 'CC0-1.0',
  title: "Migratory hive cover",
  description: "Flat transport cover with overhanging rim, center ribs and lift tabs. Material controls: timber, steel. Presets: freshApiary and weatheredYard.",
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

presets({
  freshApiary: { timber: '#d4a462', steel: '#b7c0be' },
  weatheredYard: { timber: '#68543d', steel: '#716d63' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("migratory-hive-cover");
p.part("cover-panel",b(0,0,40,720,620,50).color(timber));
p.part("front-rim",b(0,-300,0,760,30,85).color(timber));
p.part("back-rim",b(0,300,0,760,30,85).color(timber));
p.part("left-rim",b(-365,0,0,30,570,85).color(timber));
p.part("right-rim",b(365,0,0,30,570,85).color(timber));
p.part("rib-left",b(-190,0,90,45,560,35).color(timber));
p.part("rib-right",b(190,0,90,45,560,35).color(timber));
p.part("handle-left",b(-250,0,110,80,50,35).color(timber));
p.part("handle-right",b(250,0,110,80,50,35).color(timber));


p.part("metal-skin",b(0,0,80,700,540,12).color(steel));

return p.model();
