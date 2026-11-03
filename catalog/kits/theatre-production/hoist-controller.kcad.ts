// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hoist-controller",
  license: 'CC0-1.0',
  title: "Hoist controller",
  description: "Handheld pendant with a cord entry, two oversized control buttons and lower cable exit. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b737a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("hoist-controller");
p.part("pendant-body", b(0,0,100,260,130,600).color(color));
p.part("shoulder", b(0,0,700,300,150,100).color(color));
p.part("button-guard-left", b(-62,-78,470,90,32,105).color(color));
p.part("button-guard-right", b(62,-78,470,90,32,105).color(color));
p.part("label-panel", b(0,-70,300,170,25,105).color(color));
p.part("grip", b(0,0,0,210,110,110).color(color));
p.part("button-left", c(-62,-100,480,80,36,10).color(color));
p.part("button-right", c(62,-100,480,80,36,10).color(color));
p.part("cable-entry", c(0,0,800,140,30,10).color(color));
p.part("cable-tail", c(0,0,0,170,18,10).color(color));

return p.model();
