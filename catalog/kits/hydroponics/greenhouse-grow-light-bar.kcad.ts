// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "greenhouse-grow-light-bar",
  license: 'CC0-1.0',
  title: "Greenhouse grow light bar",
  description: "Single suspended lighting bar with end caps, support straps and a cable junction box. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77897c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("greenhouse-grow-light-bar");
p.part("light-diffuser", b(0,0,0,1600,160,70).color(color));
p.part("upper-housing", b(0,0,70,1600,180,75).color(color));
p.part("end-cap-left", b(-800,0,35,60,205,95).color(color));
p.part("end-cap-right", b(800,0,35,60,205,95).color(color));
p.part("suspension-left", b(-630,0,145,38,38,260).color(color));
p.part("suspension-right", b(630,0,145,38,38,260).color(color));
p.part("junction-box", b(0,70,145,240,130,85).color(color));
p.part("cable-entry", c(0,100,230,140,18,10).color(color));

return p.model();
