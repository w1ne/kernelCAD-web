// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "busway-plug-in-unit",
  license: 'CC0-1.0',
  title: "Busway plug-in unit",
  description: "Compact plug-in tap box with operating handle and cable outlet gland. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b7955", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("busway-plug-in-unit");
p.part("tap-box", b(0, 0, 0, 300, 280, 460).color(color));
p.part("cover", b(0, -150, 25, 255, 35, 405).color(color));
p.part("handle", b(0, -205, 250, 90, 85, 40).color(color));
p.part("cable-gland", c(0, 0, 0, 80, 55, 10).color(color));
p.part("interlock-knob", c(90, -205, 235, 36, 18, 8).color(color));

return p.model();
