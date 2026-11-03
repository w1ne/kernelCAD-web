// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "surface-storage-shed",
  license: 'CC0-1.0',
  title: "Surface storage shed",
  description: "Boxy field storage module with double doors, roof lip and raised corner feet. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b8174", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("surface-storage-shed");
p.part("body",b(0,0,100,1200,900,1500).color(color));
p.part("roof",b(0,0,1600,1300,1000,80).color(color));
p.part("door-left",b(-270,-460,140,500,24,1250).color(color));
p.part("door-right",b(270,-460,140,500,24,1250).color(color));
p.part("foot--500--350",b(-500,-350,0,120,120,100).color(color));
p.part("foot--500-350",b(-500,350,0,120,120,100).color(color));
p.part("foot-500--350",b(500,-350,0,120,120,100).color(color));
p.part("foot-500-350",b(500,350,0,120,120,100).color(color));

return p.model();
