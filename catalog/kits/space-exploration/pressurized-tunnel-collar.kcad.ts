// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "pressurized-tunnel-collar",
  license: 'CC0-1.0',
  title: "Pressurized tunnel collar",
  description: "Circular tunnel connection ring with broad flange, inner lip and four bolt bosses. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c8585", { label: 'Asset color' });
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("pressurized-tunnel-collar");
p.part("flange",c(0,0,0,85,410,12).color(color));
p.part("inner-lip",c(0,0,85,45,340,12).color(color));
p.part("bolt-0",c(0,-370,0,70,28,8).color(color));
p.part("bolt-1",c(370,0,0,70,28,8).color(color));
p.part("bolt-2",c(0,370,0,70,28,8).color(color));
p.part("bolt-3",c(-370,0,0,70,28,8).color(color));

return p.model();
