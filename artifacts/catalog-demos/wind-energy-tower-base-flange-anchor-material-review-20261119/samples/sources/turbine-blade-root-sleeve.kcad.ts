// SPDX-License-Identifier: CC0-1.0
// Blade root sleeve. Short blade-root sleeve with a broad flange, inner collar and four attachment lugs. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-blade-root-sleeve",
  license: 'CC0-1.0',
  title: "Blade root sleeve",
  description: "Short blade-root sleeve with a broad flange, inner collar and four attachment lugs. Controls: scale and fiberglass composite, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fiberglassComposite = param('fiberglassComposite', '#e7ebe1', { label: 'Fiberglass composite' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"fiberglassComposite": "#b4b7b0", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"fiberglassComposite": "#e48d35"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-blade-root-sleeve");
p.part("flange",c(0,0,0,70,310,12).color(fiberglassComposite));
p.part("sleeve",c(0,0,70,430,190,10).color(fiberglassComposite));
p.part("lug-0",b(230,0,20,80,100,80).color(stainlessSteel));
p.part("lug-1",b(-230,0,20,80,100,80).color(stainlessSteel));
p.part("lug-2",b(0,230,20,80,100,80).color(stainlessSteel));
p.part("lug-3",b(0,-230,20,80,100,80).color(stainlessSteel));

return p.model();
