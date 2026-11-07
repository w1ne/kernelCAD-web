// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "peristaltic-dosing-pump",
  license: 'CC0-1.0',
  title: "Peristaltic dosing pump",
  description: "Bench-mounted metering pump with circular pump head, tubing guide and raised controller housing. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a8178", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("peristaltic-dosing-pump");
p.part("mounting-foot", b(0,0,0,360,300,55).color(color));
p.part("pump-base", b(0,0,55,340,240,210).color(color));
p.part("controller", b(0,120,265,250,100,210).color(color));
p.part("screen-bezel", b(0,175,360,155,22,90).color(color));
p.part("tubing-guide-left", b(-185,-30,170,42,180,42).color(color));
p.part("tubing-guide-right", b(185,-30,170,42,180,42).color(color));
p.part("pump-head", c(0,-150,110,205,110,10).color(color));
p.part("rotor-cap", c(0,-150,315,54,45,10).color(color));
p.part("tube-inlet", c(-220,-60,205,150,22,10).color(color));
p.part("tube-outlet", c(220,-60,205,150,22,10).color(color));

return p.model();
