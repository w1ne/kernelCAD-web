// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "charger-cable-holster-bollard",
  license: 'CC0-1.0',
  title: "Cable holster bollard",
  description: "Protective post with a raised connector cradle, cable loop, and heavy base plate. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777263", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("charger-cable-holster-bollard");
p.part("anchor-foot", c(0, 0, 0, 85, 170, 10).color(color));
p.part("bollard-post", c(0, 0, 80, 1050, 88, 10).color(color));
p.part("cap", c(0, 0, 1125, 90, 98, 10).color(color));
p.part("cradle-support", b(130, -80, 670, 290, 100, 65).color(color));
p.part("connector-cradle", b(155, -180, 690, 190, 95, 180).color(color));
p.part("cable-guide", hy(-120, -120, 570, 120, 32, 8).color(color));

return p.model();
