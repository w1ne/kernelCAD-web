// SPDX-License-Identifier: CC0-1.0
// Honey bottling stand: Small bottling platform with raised support rails, bottle seat and valve clearance. Separate hive timber, stainless steel, rubber surfaces clarify the parts.

meta({
  name: "bottling-stand",
  license: 'CC0-1.0',
  title: "Honey bottling stand",
  description: "Small bottling platform with raised support rails, bottle seat and valve clearance. Material controls: timber, stainless, rubber. Presets: brightStainless and warmHarvest.",
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
const rubber = param('rubber', "#333a3b", { label: "Rubber" });

presets({
  brightStainless: { timber: '#d4a462', stainless: '#d9dfdc', rubber: '#485152' },
  warmHarvest: { timber: '#68543d', stainless: '#788482', rubber: '#252b2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("bottling-stand");
p.part("base",b(0,0,0,560,430,55).color(timber));
p.part("back-post",b(0,180,55,60,70,390).color(timber));
p.part("top-rail",b(0,180,430,460,60,55).color(timber));
p.part("left-guide",b(-180,-20,55,45,220,130).color(stainless));
p.part("right-guide",b(180,-20,55,45,220,130).color(stainless));
p.part("bottle-stop",b(0,-175,55,350,35,85).color(timber));
p.part("front-feet",b(0,-170,0,420,45,45).color(rubber));

return p.model();
