// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "environmental-sensor",
  license: 'CC0-1.0',
  title: "Environmental sensor",
  description: "Room sensor mast with compact head, directional cap, and mounting plate. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7773", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("environmental-sensor");
p.part("mount-plate", b(0, 0, 0, 210, 210, 35).color(color));
p.part("mast", b(0, 0, 35, 48, 48, 920).color(color));
p.part("sensor-head", b(0, 0, 955, 220, 155, 220).color(color));
p.part("vent-cap", c(0, 0, 1175, 80, 95, 10).color(color));
p.part("probe-tip", c(0, -90, 915, 120, 22, 8).color(color));

return p.model();
