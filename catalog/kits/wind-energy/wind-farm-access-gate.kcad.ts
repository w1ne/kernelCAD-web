// SPDX-License-Identifier: CC0-1.0
// Wind farm access gate. Two-post service gate with a framed swing panel and two weighted post shoes. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "wind-farm-access-gate",
  license: 'CC0-1.0',
  title: "Wind farm access gate",
  description: "Two-post service gate with a framed swing panel and two weighted post shoes. Controls: scale and galvanized steel, safety paint; weathered and high-visibility presets.",
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

const p=assembly("wind-farm-access-gate");
p.part("post-left",b(-700,0,40,75,75,1250).color(galvanizedSteel));
p.part("post-right",b(700,0,40,75,75,1250).color(galvanizedSteel));
p.part("top",b(0,0,1180,1380,65,65).color(galvanizedSteel));
p.part("bottom",b(0,0,110,1380,65,65).color(galvanizedSteel));
p.part("bar-a",b(-400,0,155,65,65,1020).color(galvanizedSteel));
p.part("bar-b",b(0,0,155,65,65,1020).color(galvanizedSteel));
p.part("bar-c",b(400,0,155,65,65,1020).color(galvanizedSteel));
p.part("shoe--700",b(-700,0,0,220,220,80).color(safetyPaint));
p.part("shoe-700",b(700,0,0,220,220,80).color(safetyPaint));

return p.model();
