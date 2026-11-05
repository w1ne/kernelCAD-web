// SPDX-License-Identifier: CC0-1.0
// Turbine nacelle shell. Long nacelle housing with raised roof, nose cap, rear service panel and support saddle. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-nacelle-shell",
  license: 'CC0-1.0',
  title: "Turbine nacelle shell",
  description: "Long nacelle housing with raised roof, nose cap, rear service panel and support saddle. Controls: scale and painted steel, cast steel; weathered and high-visibility presets.",
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

const p=assembly("turbine-nacelle-shell");
p.part("shell",b(0,0,85,1050,390,220).color(paintedSteel));
p.part("roof",b(0,0,215,950,350,45).color(paintedSteel));
p.part("nose",c(-520,0,45,100,180,8).color(paintedSteel));
p.part("rear-panel",b(520,0,95,25,320,160).color(paintedSteel));
p.part("saddle",b(0,0,0,460,500,50).color(castSteel));

return p.model();
