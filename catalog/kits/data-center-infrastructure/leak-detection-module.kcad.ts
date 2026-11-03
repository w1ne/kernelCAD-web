// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "leak-detection-module",
  license: 'CC0-1.0',
  title: "Leak detection module",
  description: "Water-leak monitor enclosure with probe terminals and floor sensor puck. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#78816d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("leak-detection-module");
p.part("monitor-box", b(0, 0, 0, 460, 300, 250).color(color));
p.part("control-face", b(0, -160, 40, 400, 24, 170).color(color));
p.part("probe-terminal-left", c(-120, -190, 130, 65, 30, 8).color(color));
p.part("probe-terminal-right", c(120, -190, 130, 65, 30, 8).color(color));
p.part("floor-sensor-puck", b(420, 0, 0, 180, 180, 40).color(color));
p.part("sensor-cable", hy(250, 0, 25, 500, 14, 8).color(color));

return p.model();
