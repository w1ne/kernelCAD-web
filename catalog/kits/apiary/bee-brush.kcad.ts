// SPDX-License-Identifier: CC0-1.0
// Bee brush: Long-handled frame brush with a broad ferrule and a compact bristle block. Separate hive timber, brass hardware, brush fiber surfaces clarify the parts.

meta({
  name: "bee-brush",
  license: 'CC0-1.0',
  title: "Bee brush",
  description: "Long-handled frame brush with a broad ferrule and a compact bristle block. Material controls: timber, brass, fiber. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const brass = param('brass', "#a97932", { label: "Brass hardware" });
const fiber = param('fiber', "#d7c394", { label: "Brush fiber" });

presets({
  freshApiary: { timber: '#d4a462', brass: '#c49a50', fiber: '#ede0b7' },
  weatheredYard: { timber: '#68543d', brass: '#725225', fiber: '#92794b' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("bee-brush");
p.part("handle",b(0,0,0,45,55,300).color(timber));
p.part("ferrule",b(0,0,300,110,60,45).color(brass));
p.part("bristles",b(0,0,345,145,95,42).color(fiber));
p.part("bristle-0",b(-55,0,385,8,78,35).color(fiber));
p.part("bristle-1",b(-33,0,385,8,78,35).color(fiber));
p.part("bristle-2",b(-11,0,385,8,78,35).color(fiber));
p.part("bristle-3",b(11,0,385,8,78,35).color(fiber));
p.part("bristle-4",b(33,0,385,8,78,35).color(fiber));
p.part("bristle-5",b(55,0,385,8,78,35).color(fiber));

return p.model();
