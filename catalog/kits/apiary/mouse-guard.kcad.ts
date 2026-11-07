// SPDX-License-Identifier: CC0-1.0
// Hive mouse guard: Narrow hive entrance guard plate with a row of evenly spaced vertical bars. Separate hive timber, stainless steel surfaces clarify the parts.

meta({
  name: "mouse-guard",
  license: 'CC0-1.0',
  title: "Hive mouse guard",
  description: "Narrow hive entrance guard plate with a row of evenly spaced vertical bars. Material controls: timber, stainless. Presets: freshApiary and weatheredYard.",
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

presets({
  freshApiary: { timber: '#d4a462', stainless: '#d9dfdc' },
  weatheredYard: { timber: '#68543d', stainless: '#788482' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("mouse-guard");
p.part("plate",b(0,0,20,620,32,65).color(timber));
p.part("top-rail",b(0,0,85,620,30,25).color(timber));
p.part("bottom-rail",b(0,0,0,620,30,25).color(timber));
p.part("guard-bar-0",b(-270,0,20,18,28,90).color(stainless));
p.part("guard-bar-1",b(-210,0,20,18,28,90).color(stainless));
p.part("guard-bar-2",b(-150,0,20,18,28,90).color(stainless));
p.part("guard-bar-3",b(-90,0,20,18,28,90).color(stainless));
p.part("guard-bar-4",b(-30,0,20,18,28,90).color(stainless));
p.part("guard-bar-5",b(30,0,20,18,28,90).color(stainless));
p.part("guard-bar-6",b(90,0,20,18,28,90).color(stainless));
p.part("guard-bar-7",b(150,0,20,18,28,90).color(stainless));
p.part("guard-bar-8",b(210,0,20,18,28,90).color(stainless));
p.part("guard-bar-9",b(270,0,20,18,28,90).color(stainless));

return p.model();
