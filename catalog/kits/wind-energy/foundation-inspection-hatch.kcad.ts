// SPDX-License-Identifier: CC0-1.0
// Foundation inspection hatch. Circular foundation access hatch with raised rim, inset lid and twin lift tabs. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "foundation-inspection-hatch",
  license: 'CC0-1.0',
  title: "Foundation inspection hatch",
  description: "Circular foundation access hatch with raised rim, inset lid and twin lift tabs. Controls: scale and structural steel, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"structuralSteel": "#425258", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"structuralSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("foundation-inspection-hatch");
p.part("rim",c(0,0,0,65,330,12).color(structuralSteel));
p.part("lid",c(0,0,65,35,270,12).color(structuralSteel));
p.part("tab-left",b(-170,-250,95,80,45,35).color(stainlessSteel));
p.part("tab-right",b(170,-250,95,80,45,35).color(stainlessSteel));
p.part("bolt-a",c(0,230,65,25,18,8).color(stainlessSteel));
p.part("bolt-b",c(0,-230,65,25,18,8).color(stainlessSteel));

return p.model();
