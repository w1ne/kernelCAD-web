// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "handheld-ec-meter",
  license: 'CC0-1.0',
  title: "Handheld EC meter",
  description: "Handheld conductivity meter with a tapered-looking grip, raised display and probe lead. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#778679", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("handheld-ec-meter");
p.part("meter-body", b(0,0,80,250,150,440).color(color));
p.part("shoulder", b(0,0,520,300,170,90).color(color));
p.part("display", b(0,-80,400,175,22,130).color(color));
p.part("button-one", b(-58,-94,255,42,25,42).color(color));
p.part("button-two", b(58,-94,255,42,25,42).color(color));
p.part("probe-clip", b(130,0,130,90,60,100).color(color));
p.part("probe-stem", c(130,0,0,200,18,10).color(color));
p.part("probe-tip", c(130,0,0,70,27,10).color(color));
p.part("lanyard-eye", c(0,0,610,75,31,10).color(color));

return p.model();
