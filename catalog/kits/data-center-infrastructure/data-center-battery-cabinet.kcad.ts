// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "data-center-battery-cabinet",
  license: 'CC0-1.0',
  title: "Data-center battery cabinet",
  description: "Tall battery enclosure with repeated drawer fronts and isolated base plinth. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626b70", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("data-center-battery-cabinet");
p.part("base-plinth", b(0, 0, 0, 930, 910, 100).color(color));
p.part("cabinet-shell", b(0, 0, 100, 850, 840, 1820).color(color));
p.part("front-door", b(0, -435.0, 165, 760, 30, 1700).color(color));
p.part("vent-louver-0", b(0, -454.0, 330, 357.0, 18, 24).color(color));
p.part("vent-louver-1", b(0, -454.0, 402, 357.0, 18, 24).color(color));
p.part("vent-louver-2", b(0, -454.0, 474, 357.0, 18, 24).color(color));
p.part("vent-louver-3", b(0, -454.0, 546, 357.0, 18, 24).color(color));
p.part("vent-louver-4", b(0, -454.0, 618, 357.0, 18, 24).color(color));
p.part("vent-louver-5", b(0, -454.0, 690, 357.0, 18, 24).color(color));
p.part("operator-display", b(-229.50000000000003, -452.0, 1382.3999999999999, 155, 24, 115).color(color));
p.part("door-handle", b(306.0, -448.0, 825.6, 35, 30, 260).color(color));
p.part("control-knob", c(-229.50000000000003, -476.0, 1228.8, 38, 22, 8).color(color));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(color));

return p.model();
