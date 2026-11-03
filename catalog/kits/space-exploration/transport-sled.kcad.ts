// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "transport-sled",
  license: 'CC0-1.0',
  title: "Surface cargo sled",
  description: "Low cargo sled with twin runners, cross braces and a raised tow loop. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b7a5e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("transport-sled");
p.part("runner-left",b(0,-250,0,1250,80,50).color(color));
p.part("runner-right",b(0,250,0,1250,80,50).color(color));
p.part("cross-0",b(-440,0,65,80,560,80).color(color));
p.part("cross-1",b(-150,0,65,80,560,80).color(color));
p.part("cross-2",b(140,0,65,80,560,80).color(color));
p.part("cross-3",b(430,0,65,80,560,80).color(color));
p.part("deck",b(0,0,125,1050,510,40).color(color));
p.part("tow-loop",c(0,-670,35,100,38,8).color(color));

return p.model();
