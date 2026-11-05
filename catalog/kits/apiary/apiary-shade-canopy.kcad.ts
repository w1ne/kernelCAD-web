// SPDX-License-Identifier: CC0-1.0
// Apiary shade canopy: Open four-post shade shelter with top frame, roof slats and cross braces. Separate hive timber, canvas and protective fabric, galvanized steel surfaces clarify the parts.

meta({
  name: "apiary-shade-canopy",
  license: 'CC0-1.0',
  title: "Apiary shade canopy",
  description: "Open four-post shade shelter with top frame, roof slats and cross braces. Material controls: timber, fabric, steel. Presets: summerCanopy and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const fabric = param('fabric', "#c8b78f", { label: "Canvas and protective fabric" });
const steel = param('steel', "#647176", { label: "Galvanized steel" });

presets({
  summerCanopy: { timber: '#d4a462', fabric: '#e7dfc9', steel: '#b7c0be' },
  weatheredYard: { timber: '#68543d', fabric: '#78664a', steel: '#716d63' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("apiary-shade-canopy");
p.part("post--400--300",b(-400,-300,0,55,55,1050).color(timber));
p.part("post--400-300",b(-400,300,0,55,55,1050).color(timber));
p.part("post-400--300",b(400,-300,0,55,55,1050).color(timber));
p.part("post-400-300",b(400,300,0,55,55,1050).color(timber));
p.part("beam-front",b(0,-300,1030,850,60,65).color(timber));
p.part("beam-back",b(0,300,1030,850,60,65).color(timber));
p.part("beam-left",b(-400,0,1030,60,650,65).color(timber));
p.part("beam-right",b(400,0,1030,60,650,65).color(timber));
p.part("roof-slat-0",b(-320,0,1100,55,650,35).color(timber));
p.part("roof-slat-1",b(-160,0,1100,55,650,35).color(timber));
p.part("roof-slat-2",b(0,0,1100,55,650,35).color(timber));
p.part("roof-slat-3",b(160,0,1100,55,650,35).color(timber));
p.part("roof-slat-4",b(320,0,1100,55,650,35).color(timber));


p.part("shade-cloth",b(0,0,1135,780,600,14).color(fabric));
p.part("corner-bracket-front-left",b(-400,-300,1040,58,58,95).color(steel));
p.part("corner-bracket-front-right",b(400,-300,1040,58,58,95).color(steel));
p.part("corner-bracket-back-left",b(-400,300,1040,58,58,95).color(steel));
p.part("corner-bracket-back-right",b(400,300,1040,58,58,95).color(steel));

return p.model();
