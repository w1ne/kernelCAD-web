// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "charging-station-direction-sign",
  license: 'CC0-1.0',
  title: "Charging station direction sign",
  description: "Roadside direction sign with a two-panel face, support post, and ground sleeve. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#64756c", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);

const p=assembly("charging-station-direction-sign");
p.part("ground-sleeve", b(0, 0, 0, 280, 260, 220).color(color));
p.part("sign-post", c(0, 0, 220, 2500, 48, 8).color(color));
p.part("sign-panel", b(0, -20, 1840, 740, 70, 560).color(color));
p.part("sign-face", b(0, -62, 1890, 696, 18, 450).color(color));
p.part("top-cap", b(0, 0, 2780, 140, 140, 28).color(color));
p.part("lower-arrow-panel", b(0, -22, 1180, 620, 65, 230).color(color));
p.part("arrow-shaft", hx(0, -75, 1295, 300, 30, 8).color(color));

return p.model();
