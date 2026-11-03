// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rack-mounted-battery-tray",
  license: 'CC0-1.0',
  title: "Rack-mounted battery tray",
  description: "Compact rack battery module with cell covers, front latch, and slide rails. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5a666e", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("rack-mounted-battery-tray");
p.part("tray-shell", b(0, 0, 0, 430, 690, 155).color(color));
p.part("front-cover", b(0, -355, 16, 390, 30, 120).color(color));
p.part("cell-cover-0", b(-150, 35, 155, 75, 520, 180).color(color));
p.part("cell-cover-1", b(-50, 35, 155, 75, 520, 180).color(color));
p.part("cell-cover-2", b(50, 35, 155, 75, 520, 180).color(color));
p.part("cell-cover-3", b(150, 35, 155, 75, 520, 180).color(color));
p.part("slide-rail-left", hx(0, -250, 55, 520, 16, 8).color(color));
p.part("slide-rail-right", hx(0, 250, 55, 520, 16, 8).color(color));
p.part("terminal-post-positive", c(-160, -390, 135, 22, 16, 8).color(color));
p.part("terminal-post-negative", c(160, -390, 135, 22, 16, 8).color(color));

return p.model();
