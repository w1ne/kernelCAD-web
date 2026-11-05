// SPDX-License-Identifier: CC0-1.0
// Turbine service lift cage. Rectangular service cage with platform floor, four uprights and overhead rail. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "service-lift-cage",
  license: 'CC0-1.0',
  title: "Turbine service lift cage",
  description: "Rectangular service cage with platform floor, four uprights and overhead rail. Controls: scale and galvanized steel, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"galvanizedSteel": "#6c7a7b", "safetyPaint": "#ffc336"},
  highVisibility: {"safetyPaint": "#f7c331", "galvanizedSteel": "#7a898b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("service-lift-cage");
p.part("floor",b(0,0,0,650,620,60).color(galvanizedSteel));
p.part("post--280--260",b(-280,-260,30,45,45,900).color(galvanizedSteel));
p.part("post--280-260",b(-280,260,30,45,45,900).color(galvanizedSteel));
p.part("post-280--260",b(280,-260,30,45,45,900).color(galvanizedSteel));
p.part("post-280-260",b(280,260,30,45,45,900).color(galvanizedSteel));
p.part("top-rail",b(0,0,930,650,620,55).color(galvanizedSteel));
p.part("back-rail",b(0,260,490,600,35,45).color(galvanizedSteel));
p.part("gate",b(0,-260,390,570,25,500).color(safetyPaint));

return p.model();
