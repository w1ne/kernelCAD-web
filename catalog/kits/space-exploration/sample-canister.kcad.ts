// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-canister",
  license: 'CC0-1.0',
  title: "Regolith sample canister",
  description: "Sealed cylindrical sample canister with lid band, side grip and a flat foot ring. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b39b70", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("sample-canister");
p.part("body",c(0,0,20,420,180,8).color(color));
p.part("lid",c(0,0,440,55,195,8).color(color));
p.part("rim",c(0,0,0,35,190,8).color(color));
p.part("handle",b(0,-205,250,150,35,55).color(color));

return p.model();
