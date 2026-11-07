// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "field-tool-chest",
  license: 'CC0-1.0',
  title: "Field tool chest",
  description: "Low tool chest with a hinged-looking lid, front drawer line and side grab handles. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#716c5e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("field-tool-chest");
p.part("base",b(0,0,0,780,500,160).color(color));
p.part("lid",b(0,0,170,820,540,180).color(color));
p.part("drawer",b(0,-258,35,550,20,90).color(color));
p.part("handle-left",b(-440,0,100,65,130,160).color(color));
p.part("handle-right",b(440,0,100,65,130,160).color(color));
p.part("latch",b(0,-280,185,100,30,65).color(color));

return p.model();
