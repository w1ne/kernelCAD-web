// SPDX-License-Identifier: CC0-1.0
// Inner hive cover: Thin inner cover board with raised perimeter rim and central ventilation collar. Separate hive timber, stainless steel surfaces clarify the parts.

meta({
  name: "inner-hive-cover",
  license: 'CC0-1.0',
  title: "Inner hive cover",
  description: "Thin inner cover board with raised perimeter rim and central ventilation collar. Material controls: timber, stainless. Presets: freshApiary and weatheredYard.",
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
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("inner-hive-cover");
p.part("board",b(0,0,25,620,520,35).color(timber));
p.part("rim-front",b(0,-245,0,650,25,65).color(timber));
p.part("rim-back",b(0,245,0,650,25,65).color(timber));
p.part("rim-left",b(-312,0,0,25,470,65).color(timber));
p.part("rim-right",b(312,0,0,25,470,65).color(timber));
p.part("vent-collar",c(0,0,60,45,75,8).color(stainless));
p.part("grip",b(0,0,105,180,70,30).color(stainless));

return p.model();
