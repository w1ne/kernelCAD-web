// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-trailer-cart",
  license: 'CC0-1.0',
  title: "Sample trailer cart",
  description: "Low two-wheel sample trailer with cargo bed, drawbar and raised side rails. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8d8064", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("sample-trailer-cart");
p.part("bed",b(0,0,170,950,720,100).color(color));
p.part("rail-0",b(-430,0,270,38,720,100).color(color));
p.part("rail-1",b(-215,0,270,38,720,100).color(color));
p.part("rail-2",b(0,0,270,38,720,100).color(color));
p.part("rail-3",b(215,0,270,38,720,100).color(color));
p.part("rail-4",b(430,0,270,38,720,100).color(color));
p.part("drawbar",b(0,-520,70,90,520,70).color(color));
p.part("wheel--390",c(-390,0,0,120,210,8).color(color));
p.part("wheel-390",c(390,0,0,120,210,8).color(color));

return p.model();
