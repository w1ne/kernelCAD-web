// SPDX-License-Identifier: CC0-1.0
// Cable trench cover. Rectangular cable trench lid with reinforced cross ribs and lift slots. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "cable-trench-cover",
  license: 'CC0-1.0',
  title: "Cable trench cover",
  description: "Rectangular cable trench lid with reinforced cross ribs and lift slots. Controls: scale and galvanized steel, safety paint; weathered and high-visibility presets.",
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

const p=assembly("cable-trench-cover");
p.part("lid",b(0,0,0,1200,520,90).color(galvanizedSteel));
p.part("rib-0",b(-450,0,50,55,540,35).color(galvanizedSteel));
p.part("rib-1",b(-150,0,50,55,540,35).color(galvanizedSteel));
p.part("rib-2",b(150,0,50,55,540,35).color(galvanizedSteel));
p.part("rib-3",b(450,0,50,55,540,35).color(galvanizedSteel));
p.part("slot-left",b(-430,0,75,110,35,15).color(safetyPaint));
p.part("slot-right",b(430,0,75,110,35,15).color(safetyPaint));

return p.model();
