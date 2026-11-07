// SPDX-License-Identifier: CC0-1.0
// Solar wax melter: Angled-look insulated solar melter box with hinged lid frame, tray and support feet. Separate hive timber, tinted glass, beeswax and foundation surfaces clarify the parts.

meta({
  name: "solar-wax-melter",
  license: 'CC0-1.0',
  title: "Solar wax melter",
  description: "Angled-look insulated solar melter box with hinged lid frame, tray and support feet. Material controls: timber, glass, wax. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const glass = param('glass', "#9ac1bd", { label: "Tinted glass" });
const wax = param('wax', "#e3c978", { label: "Beeswax and foundation" });

presets({
  freshApiary: { timber: '#d4a462', glass: '#c9dfd8', wax: '#f1df9d' },
  weatheredYard: { timber: '#68543d', glass: '#6e9392', wax: '#bc9344' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("solar-wax-melter");
p.part("body",b(0,0,120,600,420,260).color(timber));
p.part("lid-frame",b(0,0,390,650,470,55).color(timber));
p.part("lid-panel",b(0,0,445,590,410,24).color(glass));
p.part("tray",b(0,0,150,470,300,30).color(wax));
p.part("front-support-left",b(-230,-150,0,55,55,120).color(timber));
p.part("front-support-right",b(230,-150,0,55,55,120).color(timber));
p.part("rear-support-left",b(-230,150,0,55,55,180).color(timber));
p.part("rear-support-right",b(230,150,0,55,55,180).color(timber));
p.part("wax-drain",b(0,-220,160,120,65,45).color(wax));

return p.model();
