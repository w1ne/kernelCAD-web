// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "spectrometer-case",
  license: 'CC0-1.0',
  title: "Field spectrometer case",
  description: "Rugged instrument case with lid seam, carry handle and two front latches. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#68746e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("spectrometer-case");
p.part("case",b(0,0,90,720,500,180).color(color));
p.part("lid",b(0,0,270,720,500,180).color(color));
p.part("handle",b(0,-260,390,200,40,70).color(color));
p.part("latch--210",b(-210,-260,210,60,35,85).color(color));
p.part("latch-210",b(210,-260,210,60,35,85).color(color));
p.part("foot",b(0,0,0,760,540,40).color(color));

return p.model();
