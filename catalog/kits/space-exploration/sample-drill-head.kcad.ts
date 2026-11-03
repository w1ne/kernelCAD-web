// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-drill-head",
  license: 'CC0-1.0',
  title: "Rock sample drill head",
  description: "Compact drill head with a stepped barrel, mounting collar and rectangular drive block. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777e7a", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("sample-drill-head");
p.part("barrel",c(0,0,100,450,95,8).color(color));
p.part("collar",c(0,0,100,70,130,8).color(color));
p.part("bit",c(0,0,550,260,42,8).color(color));
p.part("drive",b(0,130,270,300,220,240).color(color));
p.part("mount",b(0,0,0,430,370,80).color(color));

return p.model();
