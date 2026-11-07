// SPDX-License-Identifier: CC0-1.0
// Observation hive: Framed vertical viewing hive with stacked inspection panels, base and carry handle. Separate hive timber, tinted glass surfaces clarify the parts.

meta({
  name: "observation-hive",
  license: 'CC0-1.0',
  title: "Observation hive",
  description: "Framed vertical viewing hive with stacked inspection panels, base and carry handle. Material controls: timber, glass. Presets: freshApiary and weatheredYard.",
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

presets({
  freshApiary: { timber: '#d4a462', glass: '#c9dfd8' },
  weatheredYard: { timber: '#68543d', glass: '#6e9392' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("observation-hive");
p.part("base",b(0,0,0,520,330,80).color(timber));
p.part("left-rail",b(-220,0,80,45,250,980).color(timber));
p.part("right-rail",b(220,0,80,45,250,980).color(timber));
p.part("back",b(0,100,80,440,35,960).color(timber));
p.part("lower-panel",b(0,-45,130,390,30,280).color(glass));
p.part("middle-panel",b(0,-45,440,390,30,280).color(glass));
p.part("upper-panel",b(0,-45,750,390,30,280).color(glass));
p.part("top",b(0,0,1040,520,330,65).color(timber));
p.part("carry-handle",b(0,0,1105,250,65,45).color(timber));

return p.model();
