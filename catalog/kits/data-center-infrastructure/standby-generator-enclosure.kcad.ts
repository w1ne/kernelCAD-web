// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "standby-generator-enclosure",
  license: 'CC0-1.0',
  title: "Standby generator enclosure",
  description: "Packaged generator skid with acoustic canopy, exhaust stack, and service doors. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c765d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("standby-generator-enclosure");
p.part("skid", b(0, 0, 0, 2600, 1150, 130).color(color));
p.part("acoustic-canopy", b(0, 0, 130, 2400, 1000, 1300).color(color));
p.part("service-door-left", b(-700, -520, 260, 420, 35, 1040).color(color));
p.part("service-door-right", b(350, -520, 260, 420, 35, 1040).color(color));
p.part("engine-block", hx(-120, 0, 440, 1450, 260, 12).color(color));
p.part("alternator", hx(700, 0, 440, 650, 310, 12).color(color));
p.part("exhaust-stack", c(900, 300, 1430, 400, 65, 10).color(color));
p.part("service-filter", c(-800, 0, 1450, 220, 95, 10).color(color));

return p.model();
