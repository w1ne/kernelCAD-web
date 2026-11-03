// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "tracking-antenna-dish",
  license: 'CC0-1.0',
  title: "Tracking antenna dish",
  description: "Small tracking dish with a pedestal, offset feed arm and rotating-looking azimuth plate. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b4b8b3", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("tracking-antenna-dish");
p.part("base",c(0,0,0,60,210,8).color(color));
p.part("pedestal",c(0,0,60,360,72,8).color(color));
p.part("turntable",c(0,0,420,60,150,8).color(color));
p.part("dish",c(0,-190,650,55,260,8).color(color));
p.part("arm",b(0,-120,610,50,240,50).color(color));
p.part("feed",c(0,-385,590,90,55,8).color(color));

return p.model();
