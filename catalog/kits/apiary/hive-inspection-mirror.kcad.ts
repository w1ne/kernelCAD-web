// SPDX-License-Identifier: CC0-1.0
// Hive inspection mirror: Hand inspection mirror with grip, neck joint and framed rectangular viewing plate. Separate hive timber, tinted glass, rubber surfaces clarify the parts.

meta({
  name: "hive-inspection-mirror",
  license: 'CC0-1.0',
  title: "Hive inspection mirror",
  description: "Hand inspection mirror with grip, neck joint and framed rectangular viewing plate. Material controls: timber, glass, rubber. Presets: freshApiary and weatheredYard.",
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
const rubber = param('rubber', "#333a3b", { label: "Rubber" });

presets({
  freshApiary: { timber: '#d4a462', glass: '#c9dfd8', rubber: '#485152' },
  weatheredYard: { timber: '#68543d', glass: '#6e9392', rubber: '#252b2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-inspection-mirror");
p.part("handle",b(0,0,30,60,60,330).color(timber));
p.part("grip-cap",b(0,0,0,90,85,35).color(rubber));
p.part("neck",b(0,0,360,38,38,110).color(timber));
p.part("back-plate",b(0,-15,470,290,40,210).color(timber));
p.part("mirror-face",b(0,-40,480,245,15,165).color(glass));
p.part("frame-top",b(0,-50,570,300,25,28).color(timber));
p.part("frame-bottom",b(0,-50,470,300,25,28).color(timber));

return p.model();
