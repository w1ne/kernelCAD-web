// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ceiling-return-plenum",
  license: 'CC0-1.0',
  title: "Ceiling return plenum",
  description: "Ducted return-air box with support legs, branch collar, and access panel. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e7b79", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("ceiling-return-plenum");
p.part("duct-body", b(0, 0, 240, 1500, 900, 650).color(color));
p.part("service-panel", b(0, -465, 300, 700, 30, 480).color(color));
p.part("support-leg-0", b(-650, -350, 0, 90, 90, 240).color(color));
p.part("support-leg-1", b(650, -350, 0, 90, 90, 240).color(color));
p.part("support-leg-2", b(-650, 350, 0, 90, 90, 240).color(color));
p.part("support-leg-3", b(650, 350, 0, 90, 90, 240).color(color));
p.part("branch-collar", c(0, 0, 890, 360, 210, 12).color(color));
p.part("hanger-strap-left", b(-520, 0, 810, 50, 1050, 80).color(color));
p.part("hanger-strap-right", b(520, 0, 810, 50, 1050, 80).color(color));

return p.model();
