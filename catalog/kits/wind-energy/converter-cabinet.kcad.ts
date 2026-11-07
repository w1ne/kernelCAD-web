// SPDX-License-Identifier: CC0-1.0
// Power converter cabinet. Tall converter cabinet with top lip, twin front panels and side cooling louvres. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "converter-cabinet",
  license: 'CC0-1.0',
  title: "Power converter cabinet",
  description: "Tall converter cabinet with top lip, twin front panels and side cooling louvres. Controls: scale and powder-coated steel, safety paint; weathered and high-visibility presets.",
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

const p=assembly("converter-cabinet");
p.part("body",b(0,0,0,920,650,1450).color(powderCoatedSteel));
p.part("top",b(0,0,1450,980,700,60).color(powderCoatedSteel));
p.part("panel-left",b(-220,-330,80,400,20,1180).color(safetyPaint));
p.part("panel-right",b(220,-330,80,400,20,1180).color(safetyPaint));
p.part("louver-0",b(-470,0,200,18,340,90).color(powderCoatedSteel));
p.part("louver-1",b(-470,0,380,18,340,90).color(powderCoatedSteel));
p.part("louver-2",b(-470,0,560,18,340,90).color(powderCoatedSteel));
p.part("louver-3",b(-470,0,740,18,340,90).color(powderCoatedSteel));
p.part("louver-4",b(-470,0,920,18,340,90).color(powderCoatedSteel));

return p.model();
