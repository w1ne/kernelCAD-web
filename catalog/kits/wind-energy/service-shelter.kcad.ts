// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "service-shelter",
  license: 'CC0-1.0',
  title: "Wind farm service shelter",
  description: "Small field shelter with double doors, corner feet, a roof lip and vent block. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#86857a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("service-shelter");
p.part("base",b(0,0,0,1900,1500,80).color(color));
p.part("body",b(0,0,860,1750,1400,1640).color(color));
p.part("roof",b(0,0,1720,2000,1560,100).color(color));
p.part("door-left",b(-400,-710,110,650,22,1250).color(color));
p.part("door-right",b(300,-710,110,650,22,1250).color(color));
p.part("vent",b(650,-720,1340,260,18,160).color(color));

return p.model();
