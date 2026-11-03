// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "landing-gear-pod",
  license: 'CC0-1.0',
  title: "Landing gear pod",
  description: "Landing leg pod with a tapered-looking strut, broad footplate and two brace arms. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777b78", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("landing-gear-pod");
p.part("strut",c(0,0,55,700,90,8).color(color));
p.part("foot",b(0,0,0,440,440,50).color(color));
p.part("brace-left",b(-110,0,275,40,90,520).color(color));
p.part("brace-right",b(110,0,275,40,90,520).color(color));
p.part("collar",c(0,0,605,65,135,8).color(color));

return p.model();
