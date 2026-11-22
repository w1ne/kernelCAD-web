// SPDX-License-Identifier: CC0-1.0
// Apiary sign: Outdoor apiary marker with framed sign panel, two posts and weighted feet. Separate hive timber, painted enamel, galvanized steel surfaces clarify the parts.

meta({
  name: "apiary-sign",
  license: 'CC0-1.0',
  title: "Apiary sign",
  description: "Outdoor apiary marker with framed sign panel, two posts and weighted feet. Material controls: timber, enamel, steel. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const enamel = param('enamel', "#647b59", { label: "Painted enamel" });
const steel = param('steel', "#647176", { label: "Galvanized steel" });

presets({
  freshApiary: { timber: '#d4a462', enamel: '#91a66b', steel: '#b7c0be' },
  weatheredYard: { timber: '#68543d', enamel: '#4b5f48', steel: '#716d63' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("apiary-sign");
p.part("panel",b(0,0,620,660,55,360).color(enamel));
p.part("top-frame",b(0,0,990,700,75,55).color(timber));
p.part("post-left",b(-250,0,50,55,55,570).color(timber));
p.part("post-right",b(250,0,50,55,55,570).color(timber));
p.part("foot-left",b(-250,0,0,180,180,50).color(steel));
p.part("foot-right",b(250,0,0,180,180,50).color(steel));

return p.model();
