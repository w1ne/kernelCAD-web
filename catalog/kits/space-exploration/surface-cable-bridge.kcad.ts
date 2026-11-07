// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "surface-cable-bridge",
  license: 'CC0-1.0',
  title: "Surface cable bridge",
  description: "Low protective cable bridge with paired ramps, central cover and side guard lips. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#817d6e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("surface-cable-bridge");
p.part("cover",b(0,0,50,720,420,130).color(color));
p.part("ramp-left",b(-490,0,0,360,420,70).color(color));
p.part("ramp-right",b(490,0,0,360,420,70).color(color));
p.part("lip-left",b(0,-215,115,720,30,70).color(color));
p.part("lip-right",b(0,215,115,720,30,70).color(color));

return p.model();
