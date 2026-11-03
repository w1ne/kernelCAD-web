// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "inflatable-habitat-frame",
  license: 'CC0-1.0',
  title: "Inflatable habitat frame",
  description: "Inflatable habitat shell represented by a broad drum, end collars and an external rib frame. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a7a59a", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("inflatable-habitat-frame");
p.part("shell",c(0,0,30,900,410,10).color(color));
p.part("collar-a",c(0,0,0,90,450,10).color(color));
p.part("collar-b",c(0,0,870,90,450,10).color(color));
p.part("rib-0",b(-330,0,30,42,840,860).color(color));
p.part("rib-1",b(-110,0,30,42,840,860).color(color));
p.part("rib-2",b(110,0,30,42,840,860).color(color));
p.part("rib-3",b(330,0,30,42,840,860).color(color));

return p.model();
