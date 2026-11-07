// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "plant-support-clip-rack",
  license: 'CC0-1.0',
  title: "Plant support clip rack",
  description: "Compact pegboard organizer with stacked clip rails, end brackets and a freestanding foot. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7a8577", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("plant-support-clip-rack");
p.part("backboard", b(0,0,0,720,80,820).color(color));
p.part("base-foot", b(0,-80,0,850,300,75).color(color));
p.part("top-cap", b(0,0,820,760,100,55).color(color));
p.part("left-bracket", b(-350,0,75,55,90,745).color(color));
p.part("right-bracket", b(350,0,75,55,90,745).color(color));
p.part("clip-rail-low", b(0,-65,210,650,50,45).color(color));
p.part("clip-rail-mid", b(0,-65,390,650,50,45).color(color));
p.part("clip-rail-high", b(0,-65,570,650,50,45).color(color));
p.part("clip-left-low", c(-240,-110,255,90,28,10).color(color));
p.part("clip-mid-low", c(0,-110,255,90,28,10).color(color));
p.part("clip-right-low", c(240,-110,255,90,28,10).color(color));
p.part("hanging-eye", c(0,-90,650,80,38,10).color(color));

return p.model();
