// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "air-pump-cabinet",
  license: 'CC0-1.0',
  title: "Air pump cabinet",
  description: "Ventilated air pump enclosure with raised intake louvres, lift feet and a service panel. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#718176", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("air-pump-cabinet");
p.part("cabinet", b(0,0,80,760,620,980).color(color));
p.part("roof-cap", b(0,0,1060,820,680,70).color(color));
p.part("front-door", b(0,-320,180,620,35,720).color(color));
p.part("door-handle", b(270,-345,490,42,30,180).color(color));
p.part("louvre-a", b(0,-347,770,380,18,28).color(color));
p.part("louvre-b", b(0,-347,710,380,18,28).color(color));
p.part("louvre-c", b(0,-347,650,380,18,28).color(color));
p.part("left-foot", b(-300,0,0,80,580,90).color(color));
p.part("right-foot", b(300,0,0,80,580,90).color(color));
p.part("air-intake", c(-200,-365,440,150,52,10).color(color));
p.part("outlet-stub", c(320,140,850,250,42,10).color(color));

return p.model();
