// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "power-distribution-unit",
  license: 'CC0-1.0',
  title: "Surface power distribution unit",
  description: "Field power distribution box with two outlet panels, cable entries and raised roof. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7a8179", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("power-distribution-unit");
p.part("body",b(0,0,150,660,480,300).color(color));
p.part("roof",b(0,0,330,700,520,60).color(color));
p.part("panel-left",b(-150,-248,180,210,18,190).color(color));
p.part("panel-right",b(150,-248,180,210,18,190).color(color));
p.part("gland-0",c(-180,0,0,95,32,8).color(color));
p.part("gland-1",c(0,0,0,95,32,8).color(color));
p.part("gland-2",c(180,0,0,95,32,8).color(color));

return p.model();
