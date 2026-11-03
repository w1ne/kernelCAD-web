// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "cargo-airlock-pod",
  license: 'CC0-1.0',
  title: "Cargo airlock pod",
  description: "Small cargo transfer pod with rounded-looking shell, wide hatch and side grab rails. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b5aa8e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("cargo-airlock-pod");
p.part("pod",c(0,0,0,650,280,10).color(color));
p.part("cap",c(0,0,650,65,290,10).color(color));
p.part("hatch",b(0,-278,130,330,24,350).color(color));
p.part("rail-left",b(-130,-340,110,28,45,470).color(color));
p.part("rail-right",b(130,-340,110,28,45,470).color(color));

return p.model();
