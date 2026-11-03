// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "oxygen-cylinder-rack",
  license: 'CC0-1.0',
  title: "Oxygen cylinder rack",
  description: "Two-cylinder service rack with retaining hoops, bottom tray and lifting bar. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8c9b99", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("oxygen-cylinder-rack");
p.part("tray",b(0,0,35,620,300,70).color(color));
p.part("cylinder-0",c(-150,0,105,820,110,8).color(color));
p.part("cylinder-1",c(150,0,105,820,110,8).color(color));
p.part("top-bar",b(0,0,960,650,50,55).color(color));
p.part("back",b(0,100,480,600,35,780).color(color));
p.part("foot--270",b(-270,0,0,90,100,70).color(color));
p.part("foot-270",b(270,0,0,90,100,70).color(color));

return p.model();
