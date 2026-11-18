// SPDX-License-Identifier: CC0-1.0
// Queen excluder: Flat framed excluder grid with a dense array of narrow parallel bars. Separate hive timber, stainless steel surfaces clarify the parts.

meta({
  name: "queen-excluder",
  license: 'CC0-1.0',
  title: "Queen excluder",
  description: "Flat framed excluder grid with a dense array of narrow parallel bars. Material controls: timber, stainless. Presets: freshApiary and weatheredYard.",
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

const p=assembly("queen-excluder");
p.part("frame-front",b(0,-245,0,620,30,32).color(timber));
p.part("frame-back",b(0,245,0,620,30,32).color(timber));
p.part("frame-left",b(-295,0,0,30,460,32).color(timber));
p.part("frame-right",b(295,0,0,30,460,32).color(timber));
p.part("grid-0",b(-250,0,20,14,460,14).color(stainless));
p.part("grid-1",b(-200,0,20,14,460,14).color(stainless));
p.part("grid-2",b(-150,0,20,14,460,14).color(stainless));
p.part("grid-3",b(-100,0,20,14,460,14).color(stainless));
p.part("grid-4",b(-50,0,20,14,460,14).color(stainless));
p.part("grid-5",b(0,0,20,14,460,14).color(stainless));
p.part("grid-6",b(50,0,20,14,460,14).color(stainless));
p.part("grid-7",b(100,0,20,14,460,14).color(stainless));
p.part("grid-8",b(150,0,20,14,460,14).color(stainless));
p.part("grid-9",b(200,0,20,14,460,14).color(stainless));
p.part("grid-10",b(250,0,20,14,460,14).color(stainless));

return p.model();
