// SPDX-License-Identifier: CC0-1.0
// Tower access door frame. Access door frame prop with rectangular jambs, header and a threshold plate. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-door-frame",
  license: 'CC0-1.0',
  title: "Tower access door frame",
  description: "Access door frame prop with rectangular jambs, header and a threshold plate. Controls: scale and galvanized steel, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"galvanizedSteel": "#6c7a7b", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"galvanizedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("turbine-door-frame");
p.part("jamb-left",b(-380,0,30,70,70,1750).color(galvanizedSteel));
p.part("jamb-right",b(380,0,30,70,70,1750).color(galvanizedSteel));
p.part("header",b(0,0,1730,830,70,75).color(galvanizedSteel));
p.part("threshold",b(0,0,0,820,340,40).color(galvanizedSteel));
p.part("door",b(0,-40,80,680,35,1550).color(galvanizedSteel));
p.part("handle",b(280,-75,740,35,30,240).color(stainlessSteel));

return p.model();
