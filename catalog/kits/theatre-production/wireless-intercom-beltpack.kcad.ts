// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wireless-intercom-beltpack",
  license: 'CC0-1.0',
  title: "Wireless intercom beltpack",
  description: "Portable communications pack with antenna, belt clip, talk button and headset socket. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737780", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("wireless-intercom-beltpack");
p.part("pack-body", b(0,0,70,220,115,350).color(color));
p.part("belt-clip", b(0,65,80,100,30,250).color(color));
p.part("top-cap", b(0,0,420,230,125,50).color(color));
p.part("side-button", b(120,0,270,35,70,70).color(color));
p.part("front-label", b(0,-60,200,150,22,100).color(color));
p.part("antenna-base", b(70,0,465,40,40,65).color(color));
p.part("antenna", c(70,0,530,220,12,10).color(color));
p.part("talk-button", c(-50,-75,380,70,30,10).color(color));
p.part("headset-socket", c(-110,-20,100,75,32,10).color(color));

return p.model();
