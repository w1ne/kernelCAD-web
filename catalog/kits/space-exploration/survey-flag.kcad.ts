// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "survey-flag",
  license: 'CC0-1.0',
  title: "Survey flag marker",
  description: "Survey marker pole with a triangular flag panel, pointed cap and round base plate. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d1b648", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("survey-flag");
p.part("base",c(0,0,0,35,105,8).color(color));
p.part("pole",c(0,0,35,1050,24,8).color(color));
p.part("flag",b(0,0,790,300,30,220).color(color));
p.part("cap",c(0,0,1085,45,36,8).color(color));

return p.model();
