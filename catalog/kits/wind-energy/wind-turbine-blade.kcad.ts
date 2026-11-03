// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wind-turbine-blade",
  license: 'CC0-1.0',
  title: "Wind turbine blade",
  description: "Tapered-look turbine blade with a broad root block and slender tip section. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#e2e3dc", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("wind-turbine-blade");
p.part("root",b(0,0,20,250,170,130).color(color));
p.part("inner",b(0,0,190,170,120,900).color(color));
p.part("mid",b(0,0,870,110,95,900).color(color));
p.part("tip",b(0,0,1550,58,70,460).color(color));
p.part("root-ring",b(0,0,0,280,205,35).color(color));

return p.model();
