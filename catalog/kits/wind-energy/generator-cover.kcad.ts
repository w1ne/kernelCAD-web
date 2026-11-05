// SPDX-License-Identifier: CC0-1.0
// Generator housing cover. Generator cover with cylindrical end caps, central rectangular body and mounting rails. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "generator-cover",
  license: 'CC0-1.0',
  title: "Generator housing cover",
  description: "Generator cover with cylindrical end caps, central rectangular body and mounting rails. Controls: scale and painted steel, cast steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#53727c', { label: 'Painted steel' });
const castSteel = param('castSteel', '#59666b', { label: 'Cast steel' });

presets({
  weathered: {"paintedSteel": "#415961", "castSteel": "#606e74"},
  highVisibility: {"paintedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("generator-cover");
p.part("body",b(0,0,200,680,520,440).color(paintedSteel));
p.part("end-left",c(-340,0,140,320,230,8).color(paintedSteel));
p.part("end-right",c(340,0,140,320,230,8).color(paintedSteel));
p.part("rail-left",b(0,-250,0,800,65,40).color(paintedSteel));
p.part("rail-right",b(0,250,0,800,65,40).color(paintedSteel));
p.part("top",b(0,0,450,600,450,60).color(castSteel));

return p.model();
