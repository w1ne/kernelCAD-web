// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "inbound-message-board",
  license: 'CC0-1.0',
  title: "Inbound message board",
  description: "Inbound message board as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7882", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("inbound-message-board");
p.part("foundation", b(0,0,0,1872.0,803.0000000000001,100).color(color));
p.part("equipment-body", b(0,0,100,1560,730,672.8).color(color));
p.part("top-panel", b(0,0,772.8,1638.0,766.5,80).color(color));
p.part("screen-face", b(0,-390.0,498.8,717.6,35,371.2).color(color));
p.part("button-panel", b(514.8000000000001,-395.0,160,280.8,40,210).color(color));
p.part("mount-foot-a", c(-546.0,248.20000000000002,0,100,45,10).color(color));
p.part("mount-foot-b", c(546.0,248.20000000000002,0,100,45,10).color(color));
p.part("side-grip", cy(-842.4000000000001,80,406.0,110,32,10).color(color));

return p.model();
