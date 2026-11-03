// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "irrigation-lateral-header",
  license: 'CC0-1.0',
  title: "Irrigation lateral header",
  description: "Drip irrigation header with parallel distribution bar, end cap and repeated emitter drops. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a867c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("irrigation-lateral-header");
p.part("main-bar", b(0,0,580,1700,55,55).color(color));
p.part("front-mount", b(0,-180,0,1600,55,60).color(color));
p.part("rear-mount", b(0,180,0,1600,55,60).color(color));
p.part("drop-rail", b(0,0,130,1650,45,45).color(color));
p.part("end-cap", b(865,0,550,70,85,85).color(color));
p.part("drop-left", c(-600,0,170,95,19,10).color(color));
p.part("drop-mid-left", c(-200,0,170,95,19,10).color(color));
p.part("drop-mid-right", c(200,0,170,95,19,10).color(color));
p.part("drop-right", c(600,0,170,95,19,10).color(color));
p.part("flush-valve", c(-820,0,60,170,25,10).color(color));

return p.model();
