// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "vertical-axis-wind-turbine",
  license: 'CC0-1.0',
  title: "Vertical-axis wind turbine",
  description: "Vertical-axis rotor with central shaft, two curved-look blade panels and base bearings. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7e8582", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("vertical-axis-wind-turbine");
p.part("shaft",c(0,0,55,1000,55,8).color(color));
p.part("blade-a",b(0,-260,85,90,80,920).color(color));
p.part("blade-b",b(0,260,85,90,80,920).color(color));
p.part("cross-top",b(0,0,925,520,55,55).color(color));
p.part("cross-bottom",b(0,0,115,520,55,55).color(color));
p.part("bearing-top",c(0,0,955,100,120,8).color(color));
p.part("bearing-low",c(0,0,55,100,120,8).color(color));
p.part("base",b(0,0,0,680,540,50).color(color));

return p.model();
