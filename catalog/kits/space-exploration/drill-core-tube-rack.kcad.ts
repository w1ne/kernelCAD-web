// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "drill-core-tube-rack",
  license: 'CC0-1.0',
  title: "Core tube rack",
  description: "Portable core-tube rack with four parallel channels and broad end plates. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8f8a7a", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("drill-core-tube-rack");
p.part("base",b(0,0,0,820,620,80).color(color));
p.part("tube-0",c(-270,0,80,570,48,8).color(color));
p.part("tube-1",c(-90,0,80,570,48,8).color(color));
p.part("tube-2",c(90,0,80,570,48,8).color(color));
p.part("tube-3",c(270,0,80,570,48,8).color(color));
p.part("end-left",b(-380,0,170,60,650,300).color(color));
p.part("end-right",b(380,0,170,60,650,300).color(color));

return p.model();
