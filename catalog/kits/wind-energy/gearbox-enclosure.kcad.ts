// SPDX-License-Identifier: CC0-1.0
// Gearbox assembly housing. Compact gearbox housing with raised cover, mounting feet and two stepped side bosses. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "gearbox-enclosure",
  license: 'CC0-1.0',
  title: "Gearbox assembly housing",
  description: "Compact gearbox housing with raised cover, mounting feet and two stepped side bosses. Controls: scale and painted steel, cast steel, stainless steel; weathered and high-visibility presets.",
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
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"paintedSteel": "#415961", "castSteel": "#606e74"},
  highVisibility: {"paintedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("gearbox-enclosure");
p.part("housing",b(0,0,180,720,480,360).color(castSteel));
p.part("cover",b(0,0,390,660,430,70).color(paintedSteel));
p.part("shaft-left",c(-380,0,190,120,85,8).color(stainlessSteel));
p.part("shaft-right",c(380,0,190,120,85,8).color(stainlessSteel));
p.part("foot--260",b(-260,0,0,130,180,80).color(paintedSteel));
p.part("foot-260",b(260,0,0,130,180,80).color(paintedSteel));

return p.model();
