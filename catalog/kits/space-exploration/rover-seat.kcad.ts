// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "rover-seat",
  license: 'CC0-1.0',
  title: "Rover operator seat",
  description: "Simple rover seat with bucket base, raised back, arm rests and central pedestal. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c716e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("rover-seat");
p.part("cushion",b(0,0,440,420,420,130).color(color));
p.part("back",b(0,190,730,420,110,560).color(color));
p.part("arm-left",b(-245,20,580,70,390,70).color(color));
p.part("arm-right",b(245,20,580,70,390,70).color(color));
p.part("pedestal",c(0,0,60,310,95,8).color(color));
p.part("foot",b(0,0,0,360,320,60).color(color));

return p.model();
