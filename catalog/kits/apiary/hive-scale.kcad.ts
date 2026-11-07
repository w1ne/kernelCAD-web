// SPDX-License-Identifier: CC0-1.0
// Apiary hive scale: Low platform scale with four feet, support deck and compact readout pedestal. Separate stainless steel, molded polymer, tinted glass surfaces clarify the parts.

meta({
  name: "hive-scale",
  license: 'CC0-1.0',
  title: "Apiary hive scale",
  description: "Low platform scale with four feet, support deck and compact readout pedestal. Material controls: stainless, polymer, glass. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });
const glass = param('glass', "#9ac1bd", { label: "Tinted glass" });

presets({
  freshApiary: { stainless: '#d9dfdc', polymer: '#d7e2d8', glass: '#c9dfd8' },
  weatheredYard: { stainless: '#788482', polymer: '#3f5d54', glass: '#6e9392' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-scale");
p.part("platform",b(0,0,100,600,520,50).color(stainless));
p.part("foot--230--190",b(-230,-190,0,90,90,100).color(stainless));
p.part("foot--230-190",b(-230,190,0,90,90,100).color(stainless));
p.part("foot-230--190",b(230,-190,0,90,90,100).color(stainless));
p.part("foot-230-190",b(230,190,0,90,90,100).color(stainless));
p.part("readout-post",b(0,-240,150,55,50,180).color(glass));
p.part("readout",b(0,-255,330,180,70,95).color(polymer));
p.part("screen",b(0,-293,360,90,12,35).color(glass));

return p.model();
