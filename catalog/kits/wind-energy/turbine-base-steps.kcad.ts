// SPDX-License-Identifier: CC0-1.0
// Tower base access steps. Three-step access stair with side stringers and a short top landing. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-base-steps",
  license: 'CC0-1.0',
  title: "Tower base access steps",
  description: "Three-step access stair with side stringers and a short top landing. Controls: scale and galvanized steel, safety paint; weathered and high-visibility presets.",
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

const p=assembly("turbine-base-steps");
p.part("step-1",b(0,-300,0,700,220,70).color(safetyPaint));
p.part("step-2",b(0,-80,80,700,220,70).color(safetyPaint));
p.part("step-3",b(0,140,160,700,220,70).color(safetyPaint));
p.part("landing",b(0,390,240,760,300,65).color(galvanizedSteel));
p.part("side-left",b(-350,0,90,55,850,300).color(galvanizedSteel));
p.part("side-right",b(350,0,90,55,850,300).color(galvanizedSteel));

return p.model();
