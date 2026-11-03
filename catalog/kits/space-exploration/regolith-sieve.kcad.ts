// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "regolith-sieve",
  license: 'CC0-1.0',
  title: "Regolith sieve tray",
  description: "Shallow field sieve tray with raised rim, crossed support legs and a central mesh panel. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a69878", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("regolith-sieve");
p.part("mesh",b(0,0,250,640,480,24).color(color));
p.part("rim-0",b(-240,0,290,24,500,65).color(color));
p.part("rim-1",b(-80,0,290,24,500,65).color(color));
p.part("rim-2",b(80,0,290,24,500,65).color(color));
p.part("rim-3",b(240,0,290,24,500,65).color(color));
p.part("rim-side-a",b(0,-230,290,640,24,65).color(color));
p.part("rim-side-b",b(0,230,290,640,24,65).color(color));
p.part("leg--220",b(-220,0,0,55,55,500).color(color));
p.part("leg-220",b(220,0,0,55,55,500).color(color));

return p.model();
