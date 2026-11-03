// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "portable-science-console",
  license: 'CC0-1.0',
  title: "Portable science console",
  description: "Field console with tilted-looking display housing, top rail and four low mounting feet. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#66716e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("portable-science-console");
p.part("base",b(0,0,40,650,500,80).color(color));
p.part("body",b(0,0,250,600,420,360).color(color));
p.part("screen",b(0,-215,510,390,18,190).color(color));
p.part("hood",b(0,-150,620,500,120,45).color(color));
p.part("foot--250--180",b(-250,-180,0,90,90,40).color(color));
p.part("foot--250-180",b(-250,180,0,90,90,40).color(color));
p.part("foot-250--180",b(250,-180,0,90,90,40).color(color));
p.part("foot-250-180",b(250,180,0,90,90,40).color(color));

return p.model();
