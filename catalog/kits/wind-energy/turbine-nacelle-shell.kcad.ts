// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "turbine-nacelle-shell",
  license: 'CC0-1.0',
  title: "Turbine nacelle shell",
  description: "Long nacelle housing with raised roof, nose cap, rear service panel and support saddle. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d8d9d2", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-nacelle-shell");
p.part("shell",b(0,0,85,1050,390,220).color(color));
p.part("roof",b(0,0,215,950,350,45).color(color));
p.part("nose",c(-520,0,45,100,180,8).color(color));
p.part("rear-panel",b(520,0,95,25,320,160).color(color));
p.part("saddle",b(0,0,0,460,500,50).color(color));

return p.model();
