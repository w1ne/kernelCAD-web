// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbine-base-steps",
  license: 'CC0-1.0',
  title: "Tower base access steps",
  description: "Three-step access stair with side stringers and a short top landing. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747b78", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("turbine-base-steps");
p.part("step-1",b(0,-300,0,700,220,70).color(color));
p.part("step-2",b(0,-80,80,700,220,70).color(color));
p.part("step-3",b(0,140,160,700,220,70).color(color));
p.part("landing",b(0,390,240,760,300,65).color(color));
p.part("side-left",b(-350,0,90,55,850,300).color(color));
p.part("side-right",b(350,0,90,55,850,300).color(color));

return p.model();
