// SPDX-License-Identifier: CC0-1.0
// Nacelle service platform. Narrow service walkway with guard rails, mounting brackets and an access ladder stub. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "nacelle-service-platform",
  license: 'CC0-1.0',
  title: "Nacelle service platform",
  description: "Narrow service walkway with guard rails, mounting brackets and an access ladder stub. Controls: scale and galvanized steel, safety paint; weathered and high-visibility presets.",
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

const p=assembly("nacelle-service-platform");
p.part("deck",b(0,0,70,1050,360,70).color(galvanizedSteel));
p.part("rail-left",b(0,-180,130,1000,35,90).color(galvanizedSteel));
p.part("rail-right",b(0,180,130,1000,35,90).color(galvanizedSteel));
p.part("post--440",b(-440,0,130,35,35,640).color(galvanizedSteel));
p.part("post-440",b(440,0,130,35,35,640).color(galvanizedSteel));
p.part("ladder",b(0,-220,0,400,50,450).color(safetyPaint));

return p.model();
