// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "science-worktable",
  license: 'CC0-1.0',
  title: "Field science worktable",
  description: "Compact science worktable with a broad deck, four legs, lower shelf and instrument rail. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#817663", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("science-worktable");
p.part("top",b(0,0,760,1100,700,70).color(color));
p.part("shelf",b(0,0,300,900,520,50).color(color));
p.part("leg--470--270",b(-470,-270,0,70,70,760).color(color));
p.part("leg--470-270",b(-470,270,0,70,70,760).color(color));
p.part("leg-470--270",b(470,-270,0,70,70,760).color(color));
p.part("leg-470-270",b(470,270,0,70,70,760).color(color));
p.part("rail",b(0,310,900,1000,45,60).color(color));

return p.model();
