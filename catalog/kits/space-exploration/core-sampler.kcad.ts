// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "core-sampler",
  license: 'CC0-1.0',
  title: "Core sampler tool",
  description: "Long core sampler with a pointed-looking barrel, top grip and lower cutting collar. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8d8b7d", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("core-sampler");
p.part("barrel",c(0,0,0,700,62,8).color(color));
p.part("collar",c(0,0,0,55,95,8).color(color));
p.part("tip",c(0,0,700,170,36,8).color(color));
p.part("grip-left",b(-90,0,460,45,45,230).color(color));
p.part("grip-right",b(90,0,460,45,45,230).color(color));
p.part("cross-handle",b(0,0,690,300,45,45).color(color));

return p.model();
