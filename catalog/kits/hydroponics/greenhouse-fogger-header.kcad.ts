// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "greenhouse-fogger-header",
  license: 'CC0-1.0',
  title: "Greenhouse fogger header",
  description: "Suspended misting line with repeated nozzle drops, end feed and a simple support hanger. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b867c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("greenhouse-fogger-header");
p.part("header-rail", b(0,0,0,1800,55,55).color(color));
p.part("hanger-left", b(-760,0,55,60,60,400).color(color));
p.part("hanger-right", b(760,0,55,60,60,400).color(color));
p.part("brace-left", b(-760,0,455,500,50,50).color(color));
p.part("brace-right", b(760,0,455,500,50,50).color(color));
p.part("nozzle-1", c(-600,0,0,100,22,10).color(color));
p.part("nozzle-2", c(-200,0,0,100,22,10).color(color));
p.part("nozzle-3", c(200,0,0,100,22,10).color(color));
p.part("nozzle-4", c(600,0,0,100,22,10).color(color));
p.part("feed-riser", c(-880,0,0,600,28,10).color(color));
p.part("end-cap", c(900,0,0,90,36,10).color(color));

return p.model();
