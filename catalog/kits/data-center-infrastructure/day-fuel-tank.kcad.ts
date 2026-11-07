// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "day-fuel-tank",
  license: 'CC0-1.0',
  title: "Generator day tank",
  description: "Compact fuel reservoir with support feet, top fill neck, and level gauge. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#827356", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("day-fuel-tank");
p.part("support-skid", b(0, 0, 0, 1050, 800, 100).color(color));
p.part("reservoir", c(0, 0, 100, 1050, 370, 12).color(color));
p.part("fill-neck", c(0, 0, 1150, 130, 65, 10).color(color));
p.part("level-gauge", c(330, -250, 760, 450, 38, 8).color(color));
p.part("access-platform", b(0, 0, 1100, 740, 560, 45).color(color));
p.part("drain-valve", c(0, -430, 120, 140, 35, 8).color(color));

return p.model();
