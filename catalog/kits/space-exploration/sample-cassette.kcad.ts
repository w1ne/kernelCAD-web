// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-cassette",
  license: 'CC0-1.0',
  title: "Sample cassette carrier",
  description: "Stackable sample cassette with four open cell blocks and a raised handle ridge. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9b9078", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("sample-cassette");
p.part("base",b(0,0,0,720,500,50).color(color));
p.part("cell-0",b(-240,0,35,140,400,90).color(color));
p.part("cell-1",b(-80,0,35,140,400,90).color(color));
p.part("cell-2",b(80,0,35,140,400,90).color(color));
p.part("cell-3",b(240,0,35,140,400,90).color(color));
p.part("handle",b(0,0,145,520,55,45).color(color));
p.part("end-left",b(-350,0,45,40,520,110).color(color));
p.part("end-right",b(350,0,45,40,520,110).color(color));

return p.model();
