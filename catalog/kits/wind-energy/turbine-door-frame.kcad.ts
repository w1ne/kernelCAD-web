// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbine-door-frame",
  license: 'CC0-1.0',
  title: "Tower access door frame",
  description: "Access door frame prop with rectangular jambs, header and a threshold plate. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727976", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("turbine-door-frame");
p.part("jamb-left",b(-380,0,30,70,70,1750).color(color));
p.part("jamb-right",b(380,0,30,70,70,1750).color(color));
p.part("header",b(0,0,1730,830,70,75).color(color));
p.part("threshold",b(0,0,0,820,340,40).color(color));
p.part("door",b(0,-40,80,680,35,1550).color(color));
p.part("handle",b(280,-75,740,35,30,240).color(color));

return p.model();
