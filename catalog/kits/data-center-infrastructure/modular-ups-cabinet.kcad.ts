// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "modular-ups-cabinet",
  license: 'CC0-1.0',
  title: "Modular UPS cabinet",
  description: "Power cabinet with modular front drawers, service display, and ventilation louvers. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65727b", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("modular-ups-cabinet");
p.part("base-plinth", b(0, 0, 0, 1020, 790, 100).color(color));
p.part("cabinet-shell", b(0, 0, 100, 940, 720, 1580).color(color));
p.part("front-door", b(0, -375.0, 165, 850, 30, 1460).color(color));
p.part("vent-louver-0", b(0, -394.0, 330, 394.8, 18, 24).color(color));
p.part("vent-louver-1", b(0, -394.0, 402, 394.8, 18, 24).color(color));
p.part("vent-louver-2", b(0, -394.0, 474, 394.8, 18, 24).color(color));
p.part("vent-louver-3", b(0, -394.0, 546, 394.8, 18, 24).color(color));
p.part("vent-louver-4", b(0, -394.0, 618, 394.8, 18, 24).color(color));
p.part("vent-louver-5", b(0, -394.0, 690, 394.8, 18, 24).color(color));
p.part("operator-display", b(-253.8, -392.0, 1209.6, 155, 24, 115).color(color));
p.part("door-handle", b(338.4, -388.0, 722.4, 35, 30, 260).color(color));
p.part("control-knob", c(-253.8, -416.0, 1075.2, 38, 22, 8).color(color));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(color));

return p.model();
