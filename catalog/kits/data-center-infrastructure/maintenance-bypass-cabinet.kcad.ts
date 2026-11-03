// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "maintenance-bypass-cabinet",
  license: 'CC0-1.0',
  title: "Maintenance bypass cabinet",
  description: "Bypass switchboard enclosure with interlock handle and labeled control area. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77745f", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("maintenance-bypass-cabinet");
p.part("base-plinth", b(0, 0, 0, 930, 850, 100).color(color));
p.part("cabinet-shell", b(0, 0, 100, 850, 780, 1700).color(color));
p.part("front-door", b(0, -405.0, 165, 760, 30, 1580).color(color));
p.part("vent-louver-0", b(0, -424.0, 330, 357.0, 18, 24).color(color));
p.part("vent-louver-1", b(0, -424.0, 402, 357.0, 18, 24).color(color));
p.part("vent-louver-2", b(0, -424.0, 474, 357.0, 18, 24).color(color));
p.part("vent-louver-3", b(0, -424.0, 546, 357.0, 18, 24).color(color));
p.part("vent-louver-4", b(0, -424.0, 618, 357.0, 18, 24).color(color));
p.part("vent-louver-5", b(0, -424.0, 690, 357.0, 18, 24).color(color));
p.part("operator-display", b(-229.50000000000003, -422.0, 1296.0, 155, 24, 115).color(color));
p.part("door-handle", b(306.0, -418.0, 774.0, 35, 30, 260).color(color));
p.part("control-knob", c(-229.50000000000003, -446.0, 1152.0, 38, 22, 8).color(color));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(color));

return p.model();
