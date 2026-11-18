// SPDX-License-Identifier: CC0-1.0
// Torque tool case. Rugged torque tool case with lid seam, front latches and side handles. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "torque-tool-case",
  license: 'CC0-1.0',
  title: "Torque tool case",
  description: "Rugged torque tool case with lid seam, front latches and side handles. Controls: scale and recycled polymer, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const recycledPolymer = param('recycledPolymer', '#416457', { label: 'Recycled polymer' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"recycledPolymer": "#334e44", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"recycledPolymer": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("torque-tool-case");
p.part("body",b(0,0,0,760,500,180).color(recycledPolymer));
p.part("lid",b(0,0,180,780,520,180).color(recycledPolymer));
p.part("latch--220",b(-220,-265,130,70,25,75).color(stainlessSteel));
p.part("latch-220",b(220,-265,130,70,25,75).color(stainlessSteel));
p.part("handle-left",b(-420,0,90,40,120,110).color(stainlessSteel));
p.part("handle-right",b(420,0,90,40,120,110).color(stainlessSteel));

return p.model();
