// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "relay-beacon",
  license: 'CC0-1.0',
  title: "Relay beacon",
  description: "Standalone relay beacon with a capped post, indicator box and four low anchor tabs. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#dfb84d", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("relay-beacon");
p.part("base",b(0,0,30,320,320,60).color(color));
p.part("post",c(0,0,60,720,55,8).color(color));
p.part("beacon",b(0,0,810,260,260,220).color(color));
p.part("cap",b(0,0,930,300,300,40).color(color));
p.part("anchor-0",b(120,120,0,70,70,30).color(color));
p.part("anchor-1",b(-120,120,0,70,70,30).color(color));
p.part("anchor-2",b(120,-120,0,70,70,30).color(color));
p.part("anchor-3",b(-120,-120,0,70,70,30).color(color));

return p.model();
