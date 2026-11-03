// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "geological-hammer",
  license: 'CC0-1.0',
  title: "Geological sampling hammer",
  description: "Compact geology hammer with a broad head, tapered handle and pommel block. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777a77", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("geological-hammer");
p.part("head",b(0,0,560,380,120,125).color(color));
p.part("pick",b(-230,0,560,140,90,65).color(color));
p.part("handle",b(0,0,260,95,95,520).color(color));
p.part("grip",b(0,0,50,120,120,180).color(color));
p.part("pommel",b(0,0,0,140,140,60).color(color));

return p.model();
