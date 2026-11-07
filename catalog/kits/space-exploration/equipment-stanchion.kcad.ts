// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "equipment-stanchion",
  license: 'CC0-1.0',
  title: "Equipment stanchion",
  description: "Short equipment stanchion with a weighted foot, post and rectangular mounting head. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727875", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("equipment-stanchion");
p.part("foot",b(0,0,0,300,300,40).color(color));
p.part("post",c(0,0,20,720,35,8).color(color));
p.part("head",b(0,0,780,240,180,140).color(color));
p.part("cap",b(0,0,855,270,205,25).color(color));

return p.model();
