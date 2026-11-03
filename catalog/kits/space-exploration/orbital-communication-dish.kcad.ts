// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "orbital-communication-dish",
  license: 'CC0-1.0',
  title: "Orbital communication dish",
  description: "Compact orbital dish on a box bus with a feed arm and two solar-panel wings. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#c1c6c1", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("orbital-communication-dish");
p.part("bus",b(0,0,0,420,420,440).color(color));
p.part("dish",c(0,-360,280,45,300,8).color(color));
p.part("arm",b(0,-220,210,55,300,55).color(color));
p.part("feed",c(0,-510,210,100,65,8).color(color));
p.part("panel-left",b(-520,0,40,560,40,400).color(color));
p.part("panel-right",b(520,0,40,560,40,400).color(color));

return p.model();
