// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hive-scale",
  license: 'CC0-1.0',
  title: "Apiary hive scale",
  description: "Low platform scale with four feet, support deck and compact readout pedestal. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6f7775", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("hive-scale");
p.part("platform",b(0,0,100,600,520,50).color(color));
p.part("foot--230--190",b(-230,-190,0,90,90,100).color(color));
p.part("foot--230-190",b(-230,190,0,90,90,100).color(color));
p.part("foot-230--190",b(230,-190,0,90,90,100).color(color));
p.part("foot-230-190",b(230,190,0,90,90,100).color(color));
p.part("readout-post",b(0,-240,150,55,50,180).color(color));
p.part("readout",b(0,-255,330,180,70,95).color(color));
p.part("screen",b(0,-293,360,90,12,35).color(color));

return p.model();
