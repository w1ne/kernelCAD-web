// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "airlock-hatch",
  license: 'CC0-1.0',
  title: "Airlock hatch",
  description: "Circular pressure-door prop with an outer rim, central disk, handle and locking lugs. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737c7d", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("airlock-hatch");
p.part("rim",c(0,0,0,55,360,12).color(color));
p.part("door",c(0,0,55,40,300,12).color(color));
p.part("handle",b(0,-315,95,140,25,42).color(color));
p.part("lug-0",c(0,-340,55,65,34,8).color(color));
p.part("lug-1",c(240,-240,55,65,34,8).color(color));
p.part("lug-2",c(340,0,55,65,34,8).color(color));
p.part("lug-3",c(240,240,55,65,34,8).color(color));
p.part("lug-4",c(0,340,55,65,34,8).color(color));
p.part("lug-5",c(-240,240,55,65,34,8).color(color));
p.part("lug-6",c(-340,0,55,65,34,8).color(color));
p.part("lug-7",c(-240,-240,55,65,34,8).color(color));

return p.model();
