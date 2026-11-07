// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "seedling-propagation-cart",
  license: 'CC0-1.0',
  title: "Seedling propagation cart",
  description: "Mobile propagation trolley with four shallow trays, push handle and compact caster housings. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#74877d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("seedling-propagation-cart");
p.part("lower-tray", b(0,0,200,920,600,55).color(color));
p.part("tray-two", b(0,0,610,920,600,55).color(color));
p.part("tray-three", b(0,0,1020,920,600,55).color(color));
p.part("upper-tray", b(0,0,1430,920,600,55).color(color));
p.part("post-left", b(-420,220,255,45,45,1430).color(color));
p.part("post-right", b(420,220,255,45,45,1430).color(color));
p.part("push-handle", b(0,220,1705,880,48,48).color(color));
p.part("front-stop", b(0,-275,1450,870,32,85).color(color));
p.part("caster-left-front", c(-390,-235,0,155,58,10).color(color));
p.part("caster-right-front", c(390,-235,0,155,58,10).color(color));
p.part("caster-left-back", c(-390,235,0,155,58,10).color(color));
p.part("caster-right-back", c(390,235,0,155,58,10).color(color));

return p.model();
