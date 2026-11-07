// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "venturi-injector-assembly",
  license: 'CC0-1.0',
  title: "Venturi injector assembly",
  description: "Inline injector assembly with a central throat body, bypass pipe and adjustment knob. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e8582", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("venturi-injector-assembly");
p.part("support-base", b(0,0,0,720,260,55).color(color));
p.part("left-pipe", b(-440,0,320,400,70,70).color(color));
p.part("right-pipe", b(440,0,320,400,70,70).color(color));
p.part("body-center", b(0,0,275,600,180,165).color(color));
p.part("bypass-bridge", b(0,0,520,120,390,48).color(color));
p.part("bypass-left", b(-260,0,355,130,48,170).color(color));
p.part("bypass-right", b(260,0,355,130,48,170).color(color));
p.part("injector-throat", c(0,0,305,140,82,10).color(color));
p.part("adjustment-knob", c(0,-250,510,105,55,10).color(color));
p.part("suction-port", c(0,-10,480,180,28,10).color(color));

return p.model();
