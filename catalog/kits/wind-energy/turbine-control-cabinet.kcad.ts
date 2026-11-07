// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbine-control-cabinet",
  license: 'CC0-1.0',
  title: "Turbine control cabinet",
  description: "Ground control cabinet with double doors, shallow rain hood and bottom vent bank. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687572", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("turbine-control-cabinet");
p.part("body",b(0,0,80,700,500,1100).color(color));
p.part("hood",b(0,0,1190,780,580,70).color(color));
p.part("door-left",b(-175,-256,120,320,18,900).color(color));
p.part("door-right",b(175,-256,120,320,18,900).color(color));
p.part("vent",b(0,-270,70,350,16,90).color(color));
p.part("foot--250",b(-250,0,0,100,140,80).color(color));
p.part("foot-250",b(250,0,0,100,140,80).color(color));

return p.model();
