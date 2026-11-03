// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "power-meter-pedestal",
  license: 'CC0-1.0',
  title: "Power meter pedestal",
  description: "Utility metering pedestal with display head, service door, and cable riser. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#69767b", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("power-meter-pedestal");
p.part("base-plate", b(0, 0, 0, 460, 460, 80).color(color));
p.part("riser", b(0, 0, 80, 180, 180, 1020).color(color));
p.part("meter-head", b(0, 0, 1100, 520, 380, 500).color(color));
p.part("display-window", b(0, -205, 1320, 280, 30, 160).color(color));
p.part("service-door", b(0, 205, 460, 420, 30, 520).color(color));
p.part("cable-port", c(0, 0, 0, 65, 52, 8).color(color));

return p.model();
