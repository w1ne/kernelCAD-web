// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "service-lift-cage",
  license: 'CC0-1.0',
  title: "Turbine service lift cage",
  description: "Rectangular service cage with platform floor, four uprights and overhead rail. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#787e7b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("service-lift-cage");
p.part("floor",b(0,0,0,650,620,60).color(color));
p.part("post--280--260",b(-280,-260,30,45,45,900).color(color));
p.part("post--280-260",b(-280,260,30,45,45,900).color(color));
p.part("post-280--260",b(280,-260,30,45,45,900).color(color));
p.part("post-280-260",b(280,260,30,45,45,900).color(color));
p.part("top-rail",b(0,0,930,650,620,55).color(color));
p.part("back-rail",b(0,260,490,600,35,45).color(color));
p.part("gate",b(0,-260,390,570,25,500).color(color));

return p.model();
