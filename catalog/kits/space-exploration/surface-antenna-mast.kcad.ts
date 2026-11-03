// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "surface-antenna-mast",
  license: 'CC0-1.0',
  title: "Surface antenna mast",
  description: "Short surface mast with tripod feet, a crossbar and two small vertical aerials. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747c7b", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("surface-antenna-mast");
p.part("mast",c(0,0,0,1350,38,8).color(color));
p.part("crossbar",b(0,0,1040,650,45,45).color(color));
p.part("aerial-0",c(-250,0,1085,420,18,8).color(color));
p.part("aerial-1",c(250,0,1085,420,18,8).color(color));
p.part("foot-0",b(0,-190,0,240,70,45).color(color));
p.part("foot-1",b(-165,95,0,240,70,45).color(color));
p.part("foot-2",b(165,95,0,240,70,45).color(color));

return p.model();
