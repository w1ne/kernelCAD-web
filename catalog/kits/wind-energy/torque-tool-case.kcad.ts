// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "torque-tool-case",
  license: 'CC0-1.0',
  title: "Torque tool case",
  description: "Rugged torque tool case with lid seam, front latches and side handles. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6f746f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("torque-tool-case");
p.part("body",b(0,0,0,760,500,180).color(color));
p.part("lid",b(0,0,180,780,520,180).color(color));
p.part("latch--220",b(-220,-265,130,70,25,75).color(color));
p.part("latch-220",b(220,-265,130,70,25,75).color(color));
p.part("handle-left",b(-420,0,90,40,120,110).color(color));
p.part("handle-right",b(420,0,90,40,120,110).color(color));

return p.model();
