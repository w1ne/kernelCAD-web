// SPDX-License-Identifier: CC0-1.0
// Top-bar hive: Long low hive body with parallel top bars, end supports and a removable roof. Separate timber and stainless roof skin clarify the parts.

meta({
  name: "top-bar-hive",
  license: 'CC0-1.0',
  title: "Top-bar hive",
  description: "Long low hive body with parallel top bars, end supports and a removable roof. Material controls: timber and stainless. Presets: freshApiary and weatheredYard.",
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

const p=assembly("top-bar-hive");
p.part("leg-left",b(-360,0,0,55,70,440).color(timber));
p.part("leg-right",b(360,0,0,55,70,440).color(timber));
p.part("body",b(0,0,440,1050,440,300).color(timber));
p.part("landing",b(0,-250,420,1120,90,45).color(timber));
p.part("top-bar-0",b(-420,0,740,45,455,35).color(timber));
p.part("top-bar-1",b(-350,0,740,45,455,35).color(timber));
p.part("top-bar-2",b(-280,0,740,45,455,35).color(timber));
p.part("top-bar-3",b(-210,0,740,45,455,35).color(timber));
p.part("top-bar-4",b(-140,0,740,45,455,35).color(timber));
p.part("top-bar-5",b(-70,0,740,45,455,35).color(timber));
p.part("top-bar-6",b(0,0,740,45,455,35).color(timber));
p.part("top-bar-7",b(70,0,740,45,455,35).color(timber));
p.part("top-bar-8",b(140,0,740,45,455,35).color(timber));
p.part("top-bar-9",b(210,0,740,45,455,35).color(timber));
p.part("top-bar-10",b(280,0,740,45,455,35).color(timber));
p.part("top-bar-11",b(350,0,740,45,455,35).color(timber));
p.part("top-bar-12",b(420,0,740,45,455,35).color(timber));
p.part("roof",b(0,0,790,1140,520,70).color(timber));


p.part("roof-sheet",b(0,0,855,1160,540,10).color(stainless));

return p.model();
