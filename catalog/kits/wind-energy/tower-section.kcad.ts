// SPDX-License-Identifier: CC0-1.0
// Tapered tower section. Single steel tower segment with a flared lower collar and upper joint band. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "tower-section",
  license: 'CC0-1.0',
  title: "Tapered tower section",
  description: "Single steel tower segment with a flared lower collar and upper joint band. Controls: scale and painted steel, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#53727c', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"paintedSteel": "#415961", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"paintedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("tower-section");
p.part("shaft",c(0,0,50,1700,130,12).color(stainlessSteel));
p.part("lower-collar",c(0,0,0,200,180,8).color(stainlessSteel));
p.part("upper-band",c(0,0,1620,120,150,8).color(stainlessSteel));
p.part("access-panel",b(0,-128,500,180,20,350).color(paintedSteel));

return p.model();
