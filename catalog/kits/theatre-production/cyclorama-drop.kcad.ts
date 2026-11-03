// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "cyclorama-drop",
  license: 'CC0-1.0',
  title: "Cyclorama drop",
  description: "Broad rear-stage cloth drop with top pipe pocket, lower batten and two side tie tabs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#726f70", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("cyclorama-drop");
p.part("cloth", b(0,0,0,2600,80,2050).color(color));
p.part("top-pocket", b(0,0,2030,2660,110,90).color(color));
p.part("bottom-pocket", b(0,0,0,2660,110,85).color(color));
p.part("side-hem-left", b(-1270,0,85,60,100,1940).color(color));
p.part("side-hem-right", b(1270,0,85,60,100,1940).color(color));
p.part("top-tab-left", b(-900,0,2100,130,110,95).color(color));
p.part("top-tab-center", b(0,0,2100,130,110,95).color(color));
p.part("top-tab-right", b(900,0,2100,130,110,95).color(color));
p.part("sleeve-cap-left", c(-1300,0,0,85,52,10).color(color));
p.part("sleeve-cap-right", c(1300,0,0,85,52,10).color(color));

return p.model();
