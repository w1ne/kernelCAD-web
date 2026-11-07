// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "equipment-locker",
  license: 'CC0-1.0',
  title: "Field equipment locker",
  description: "Tall equipment locker with double doors, top lip and four compact feet. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8c887a", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("equipment-locker");
p.part("body",b(0,0,100,800,500,1450).color(color));
p.part("top",b(0,0,1550,860,560,70).color(color));
p.part("door-left",b(-195,-260,140,370,18,1240).color(color));
p.part("door-right",b(195,-260,140,370,18,1240).color(color));
p.part("foot--300",b(-300,0,0,100,100,100).color(color));
p.part("foot-300",b(300,0,0,100,100,100).color(color));

return p.model();
