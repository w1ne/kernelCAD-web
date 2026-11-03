// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "overhead-pantograph-head",
  license: 'CC0-1.0',
  title: "Overhead pantograph head",
  description: "Compact overhead charging head with contact bar, hinge blocks, and a mounting yoke. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e6d70", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);

const p=assembly("overhead-pantograph-head");
p.part("mounting-yoke-left", b(-270, 0, 0, 90, 320, 330).color(color));
p.part("mounting-yoke-right", b(270, 0, 0, 90, 320, 330).color(color));
p.part("head-housing", b(0, 0, 120, 840, 460, 320).color(color));
p.part("contact-rail", hx(0, -250, 75, 770, 34, 8).color(color));
p.part("pivot-left", c(-300, 0, 310, 90, 48, 8).color(color));
p.part("pivot-right", c(300, 0, 310, 90, 48, 8).color(color));
p.part("cover-panel", b(0, 0, 450, 720, 350, 50).color(color));

return p.model();
