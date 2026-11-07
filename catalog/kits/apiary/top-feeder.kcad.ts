// SPDX-License-Identifier: CC0-1.0
// Hive top feeder: Shallow top feeder with outer rim, central access well and removable cover. Separate molded polymer, tinted glass surfaces clarify the parts.

meta({
  name: "top-feeder",
  license: 'CC0-1.0',
  title: "Hive top feeder",
  description: "Shallow top feeder with outer rim, central access well and removable cover. Material controls: polymer, glass. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });
const glass = param('glass', "#9ac1bd", { label: "Tinted glass" });

presets({
  freshApiary: { polymer: '#d7e2d8', glass: '#c9dfd8' },
  weatheredYard: { polymer: '#3f5d54', glass: '#6e9392' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("top-feeder");
p.part("pan",b(0,0,0,620,520,85).color(polymer));
p.part("rim-front",b(0,-245,85,650,25,80).color(polymer));
p.part("rim-back",b(0,245,85,650,25,80).color(polymer));
p.part("rim-left",b(-312,0,85,25,470,80).color(polymer));
p.part("rim-right",b(312,0,85,25,470,80).color(polymer));
p.part("access-well",b(0,0,85,210,200,120).color(glass));
p.part("cover",b(0,0,205,250,230,25).color(polymer));

return p.model();
