// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "lunar-habitat-module",
  license: 'CC0-1.0',
  title: "Lunar habitat module",
  description: "Compact surface habitat with domed cap, four corner supports and a framed entry hatch. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b7b1a2", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("lunar-habitat-module");
p.part("body",c(0,0,80,820,360,10).color(color));
p.part("roof",c(0,0,900,100,390,10).color(color));
p.part("hatch",b(0,-355,200,300,28,500).color(color));
p.part("leg--250--250",b(-250,-250,0,90,90,130).color(color));
p.part("leg--250-250",b(-250,250,0,90,90,130).color(color));
p.part("leg-250--250",b(250,-250,0,90,90,130).color(color));
p.part("leg-250-250",b(250,250,0,90,90,130).color(color));

return p.model();
