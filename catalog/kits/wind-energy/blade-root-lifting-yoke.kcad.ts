// SPDX-License-Identifier: CC0-1.0
// Blade root lifting yoke. Lifting yoke frame with a broad crossbar, paired sling lugs and central hook eye. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "blade-root-lifting-yoke",
  license: 'CC0-1.0',
  title: "Blade root lifting yoke",
  description: "Lifting yoke frame with a broad crossbar, paired sling lugs and central hook eye. Controls: scale and structural steel, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 350,
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

const p=assembly("blade-root-lifting-yoke");
p.part("beam",b(0,0,600,1050,100,90).color(structuralSteel));
p.part("leg-left",b(-400,0,0,70,70,600).color(structuralSteel));
p.part("leg-right",b(400,0,0,70,70,600).color(structuralSteel));
p.part("eye-left",c(-400,0,600,80,85,8).color(stainlessSteel));
p.part("eye-right",c(400,0,600,80,85,8).color(stainlessSteel));
p.part("hook-eye",c(0,0,690,90,65,8).color(stainlessSteel));

return p.model();
