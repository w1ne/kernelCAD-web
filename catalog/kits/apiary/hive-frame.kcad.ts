// SPDX-License-Identifier: CC0-1.0
// Hive frame: Wooden beehive frame with top bar, side rails, bottom bar and hanging ears. Separate hive timber, beeswax and foundation surfaces clarify the parts.

meta({
  name: "hive-frame",
  license: 'CC0-1.0',
  title: "Hive frame",
  description: "Wooden beehive frame with top bar, side rails, bottom bar and hanging ears. Material controls: timber, wax. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const wax = param('wax', "#e3c978", { label: "Beeswax and foundation" });

presets({
  freshApiary: { timber: '#d4a462', wax: '#f1df9d' },
  weatheredYard: { timber: '#68543d', wax: '#bc9344' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-frame");
p.part("top-bar",b(0,0,695,500,38,42).color(timber));
p.part("ear-left",b(-280,0,695,65,50,30).color(timber));
p.part("ear-right",b(280,0,695,65,50,30).color(timber));
p.part("side-left",b(-220,0,20,35,32,675).color(timber));
p.part("side-right",b(220,0,20,35,32,675).color(timber));
p.part("bottom-bar",b(0,0,0,470,35,35).color(timber));


p.part("wax-foundation",b(0,0,40,400,12,620).color(wax));

return p.model();
