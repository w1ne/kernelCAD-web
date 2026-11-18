// SPDX-License-Identifier: CC0-1.0
// Hive stand: Raised hive support with four feet, paired rails and a broad landing deck. Separate hive timber, galvanized steel surfaces clarify the parts.

meta({
  name: "hive-stand",
  license: 'CC0-1.0',
  title: "Hive stand",
  description: "Raised hive support with four feet, paired rails and a broad landing deck. Material controls: timber, steel. Presets: freshApiary and weatheredYard.",
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

const p=assembly("hive-stand");
p.part("leg--250--180",b(-250,-180,0,70,70,300).color(timber));
p.part("leg--250-180",b(-250,180,0,70,70,300).color(timber));
p.part("leg-250--180",b(250,-180,0,70,70,300).color(timber));
p.part("leg-250-180",b(250,180,0,70,70,300).color(timber));
p.part("rail-front",b(0,-180,250,570,70,70).color(timber));
p.part("rail-back",b(0,180,250,570,70,70).color(timber));
p.part("cross-rail-left",b(-250,0,250,70,430,70).color(timber));
p.part("cross-rail-right",b(250,0,250,70,430,70).color(timber));
p.part("deck",b(0,0,320,700,520,55).color(timber));


p.part("shoe-front-left",b(-250,-180,0,70,70,12).color(steel));
p.part("shoe-front-right",b(250,-180,0,70,70,12).color(steel));
p.part("shoe-back-left",b(-250,180,0,70,70,12).color(steel));
p.part("shoe-back-right",b(250,180,0,70,70,12).color(steel));

return p.model();
