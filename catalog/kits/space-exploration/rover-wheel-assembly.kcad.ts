// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "rover-wheel-assembly",
  license: 'CC0-1.0',
  title: "Rover wheel assembly",
  description: "Oversized low-pressure rover wheel with thick tire, hub and six raised tread bars. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#55595b", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("rover-wheel-assembly");
p.part("tire",c(0,0,20,170,300,12).color(color));
p.part("hub",c(0,0,190,50,110,10).color(color));
p.part("tread-0",b(0,0,0,62,100,190).color(color));
p.part("tread-1",b(0,0,0,62,100,190).color(color));
p.part("tread-2",b(0,0,0,62,100,190).color(color));
p.part("tread-3",b(0,0,0,62,100,190).color(color));
p.part("tread-4",b(0,0,0,62,100,190).color(color));
p.part("tread-5",b(0,0,0,62,100,190).color(color));

return p.model();
