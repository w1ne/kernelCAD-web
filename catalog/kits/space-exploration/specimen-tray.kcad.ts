// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "specimen-tray",
  license: 'CC0-1.0',
  title: "Geology specimen tray",
  description: "Shallow specimen tray divided into six sample cells with reinforced corner blocks. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#aa9d7d", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("specimen-tray");
p.part("base",b(0,0,30,780,520,60).color(color));
p.part("divider-x-0",b(-180,0,100,24,480,80).color(color));
p.part("divider-x-1",b(0,0,100,24,480,80).color(color));
p.part("divider-x-2",b(180,0,100,24,480,80).color(color));
p.part("divider-y-a",b(0,-120,100,760,24,80).color(color));
p.part("divider-y-b",b(0,120,100,760,24,80).color(color));
p.part("corner-0",b(-360,-230,0,60,60,35).color(color));
p.part("corner-1",b(360,-230,0,60,60,35).color(color));
p.part("corner-2",b(-360,230,0,60,60,35).color(color));
p.part("corner-3",b(360,230,0,60,60,35).color(color));

return p.model();
