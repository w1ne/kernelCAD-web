// SPDX-License-Identifier: CC0-1.0
// Turbine control cabinet. Ground control cabinet with double doors, shallow rain hood and bottom vent bank. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-control-cabinet",
  license: 'CC0-1.0',
  title: "Turbine control cabinet",
  description: "Ground control cabinet with double doors, shallow rain hood and bottom vent bank. Controls: scale and powder-coated steel, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel = param('powderCoatedSteel', '#287082', { label: 'Powder-coated steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"powderCoatedSteel": "#1f5765", "safetyPaint": "#ffc336"},
  highVisibility: {"safetyPaint": "#f7c331", "powderCoatedSteel": "#236372"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("turbine-control-cabinet");
p.part("body",b(0,0,80,700,500,1100).color(powderCoatedSteel));
p.part("hood",b(0,0,1190,780,580,70).color(powderCoatedSteel));
p.part("door-left",b(-175,-256,120,320,18,900).color(safetyPaint));
p.part("door-right",b(175,-256,120,320,18,900).color(safetyPaint));
p.part("vent",b(0,-270,70,350,16,90).color(powderCoatedSteel));
p.part("foot--250",b(-250,0,0,100,140,80).color(powderCoatedSteel));
p.part("foot-250",b(250,0,0,100,140,80).color(powderCoatedSteel));

return p.model();
