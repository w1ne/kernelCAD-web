// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "habitat-corridor-section",
  license: 'CC0-1.0',
  title: "Habitat corridor section",
  description: "Short cylindrical pressure corridor with two raised seam rings and floor skids. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9d9a8d", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("habitat-corridor-section");
p.part("tube",c(0,0,80,560,290,10).color(color));
p.part("ring-a",c(0,0,60,70,330,10).color(color));
p.part("ring-b",c(0,0,590,70,330,10).color(color));
p.part("skid-left",b(0,-220,0,620,80,80).color(color));
p.part("skid-right",b(0,220,0,620,80,80).color(color));

return p.model();
