// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "solar-ev-carport",
  license: 'CC0-1.0',
  title: "Solar EV carport",
  description: "Parking shelter with tilted panel rows, long-span rafters, and paired support frames. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#526d73", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);

const p=assembly("solar-ev-carport");
p.part("post-left-front", b(-1900, -650, 0, 140, 150, 3100).color(color));
p.part("post-left-rear", b(-1900, 650, 0, 140, 150, 3100).color(color));
p.part("post-right-front", b(1900, -650, 0, 140, 150, 3100).color(color));
p.part("post-right-rear", b(1900, 650, 0, 140, 150, 3100).color(color));
p.part("front-beam", b(0, -650, 3100, 4150, 135, 140).color(color));
p.part("rear-beam", b(0, 650, 3500, 4150, 135, 140).color(color));
p.part("panel-rafter-a", hx(0, -390, 3260, 4020, 50, 8).color(color));
p.part("panel-rafter-b", hx(0, 50, 3380, 4020, 50, 8).color(color));
p.part("panel-rafter-c", hx(0, 470, 3460, 4020, 50, 8).color(color));
p.part("pv-panel-1", b(-1600, 0, 3217.8947368421054, 600, 1090, 32).color(color));
p.part("pv-panel-2", b(-960, 0, 3266.7368421052633, 600, 1090, 32).color(color));
p.part("pv-panel-3", b(-320, 0, 3315.5789473684213, 600, 1090, 32).color(color));
p.part("pv-panel-4", b(320, 0, 3364.4210526315787, 600, 1090, 32).color(color));
p.part("pv-panel-5", b(960, 0, 3413.2631578947367, 600, 1090, 32).color(color));
p.part("pv-panel-6", b(1600, 0, 3462.1052631578946, 600, 1090, 32).color(color));

return p.model();
