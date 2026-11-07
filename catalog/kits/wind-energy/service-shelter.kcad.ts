// SPDX-License-Identifier: CC0-1.0
// Wind farm service shelter. Small field shelter with double doors, corner feet, a roof lip and vent block. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "service-shelter",
  license: 'CC0-1.0',
  title: "Wind farm service shelter",
  description: "Small field shelter with double doors, corner feet, a roof lip and vent block. Controls: scale and powder-coated steel, concrete, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel = param('powderCoatedSteel', '#287082', { label: 'Powder-coated steel' });
const concrete = param('concrete', '#8b8c84', { label: 'Concrete' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"powderCoatedSteel": "#1f5765", "concrete": "#96978f"},
  highVisibility: {"safetyPaint": "#f7c331", "powderCoatedSteel": "#236372"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("service-shelter");
p.part("base",b(0,0,0,1900,1500,80).color(concrete));
p.part("body",b(0,0,860,1750,1400,1640).color(powderCoatedSteel));
p.part("roof",b(0,0,1720,2000,1560,100).color(powderCoatedSteel));
p.part("door-left",b(-400,-710,110,650,22,1250).color(safetyPaint));
p.part("door-right",b(300,-710,110,650,22,1250).color(safetyPaint));
p.part("vent",b(650,-720,1340,260,18,160).color(powderCoatedSteel));

return p.model();
