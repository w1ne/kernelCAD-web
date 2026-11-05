// SPDX-License-Identifier: CC0-1.0
// Langstroth hive: Stacked hive body, honey super, cover, entrance and raised stand. Separate hive timber, stainless steel, painted enamel surfaces clarify the parts.

meta({
  name: "langstroth-hive",
  license: 'CC0-1.0',
  title: "Langstroth hive",
  description: "Stacked hive body, honey super, cover, entrance and raised stand. Material controls: timber, stainless, enamel. Presets: freshApiary and weatheredYard.",
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
const enamel = param('enamel', "#647b59", { label: "Painted enamel" });

presets({
  freshApiary: { timber: '#d4a462', stainless: '#d9dfdc', enamel: '#91a66b' },
  weatheredYard: { timber: '#68543d', stainless: '#788482', enamel: '#4b5f48' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("langstroth-hive");
p.part("stand-left",b(-250,0,0,55,520,120).color(timber));
p.part("stand-right",b(250,0,0,55,520,120).color(timber));
p.part("bottom-board",b(0,0,120,620,520,60).color(timber));
p.part("brood-box",b(0,0,180,600,500,430).color(timber));
p.part("honey-super",b(0,0,610,590,490,280).color(timber));
p.part("telescoping-cover",b(0,0,890,660,560,70).color(timber));
p.part("entrance-strip",b(0,-255,150,440,35,55).color(enamel));


p.part("roof-sheet",b(0,0,955,690,590,18).color(stainless));

return p.model();
