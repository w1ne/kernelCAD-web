// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "science-instrument-tripod",
  license: 'CC0-1.0',
  title: "Science instrument tripod",
  description: "Field instrument tripod with a short mast, mounting head and three splayed legs. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#85887f", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("science-instrument-tripod");
p.part("mast",c(0,0,80,520,38,8).color(color));
p.part("head",c(0,0,600,100,125,8).color(color));
p.part("leg-0",b(0,-150,0,40,50,650).color(color));
p.part("leg-1",b(-130,75,0,40,50,650).color(color));
p.part("leg-2",b(130,75,0,40,50,650).color(color));
p.part("mount",b(0,0,690,260,180,60).color(color));

return p.model();
