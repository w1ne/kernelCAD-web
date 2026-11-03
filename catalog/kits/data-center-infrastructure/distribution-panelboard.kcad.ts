// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "distribution-panelboard",
  license: 'CC0-1.0',
  title: "Distribution panelboard",
  description: "Panelboard enclosure with hinged door, breaker rows, and cable entry gland. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#788087", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("distribution-panelboard");
p.part("wall-enclosure", b(0, 0, 0, 760, 300, 1300).color(color));
p.part("door", b(0, -165, 90, 700, 32, 1120).color(color));
p.part("interior-deadfront", b(0, -188, 250, 560, 22, 780).color(color));
p.part("breaker-row-0", b(0, -210, 350, 460, 26, 105).color(color));
p.part("breaker-row-1", b(0, -210, 510, 460, 26, 105).color(color));
p.part("breaker-row-2", b(0, -210, 670, 460, 26, 105).color(color));
p.part("breaker-row-3", b(0, -210, 830, 460, 26, 105).color(color));
p.part("cable-entry", c(0, 0, 0, 65, 58, 10).color(color));
p.part("door-latch", c(300, -195, 650, 46, 24, 8).color(color));

return p.model();
