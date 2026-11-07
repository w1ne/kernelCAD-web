// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "surface-battery-bank",
  license: 'CC0-1.0',
  title: "Surface battery bank",
  description: "Four-cell battery bank on a skid frame with vent caps and lifting rails. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777c76", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("surface-battery-bank");
p.part("skid-left",b(0,-230,0,1080,80,70).color(color));
p.part("skid-right",b(0,230,0,1080,80,70).color(color));
p.part("cell-0",b(-390,0,75,230,420,560).color(color));
p.part("cell-1",b(-130,0,75,230,420,560).color(color));
p.part("cell-2",b(130,0,75,230,420,560).color(color));
p.part("cell-3",b(390,0,75,230,420,560).color(color));
p.part("cap-0",c(-390,0,635,36,38,8).color(color));
p.part("cap-1",c(-130,0,635,36,38,8).color(color));
p.part("cap-2",c(130,0,635,36,38,8).color(color));
p.part("cap-3",c(390,0,635,36,38,8).color(color));

return p.model();
