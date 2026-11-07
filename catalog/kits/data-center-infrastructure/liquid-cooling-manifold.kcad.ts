// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "liquid-cooling-manifold",
  license: 'CC0-1.0',
  title: "Liquid-cooling manifold",
  description: "Supply and return headers with evenly spaced branch outlets and support feet. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#637a7d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("liquid-cooling-manifold");
p.part("support-base-left", b(-700, 0, 0, 180, 500, 80).color(color));
p.part("support-base-right", b(700, 0, 0, 180, 500, 80).color(color));
p.part("supply-header", hy(0, 0, 650, 1700, 85, 12).color(color));
p.part("return-header", hy(0, 0, 350, 1700, 85, 12).color(color));
p.part("branch-drop-0", c(-600, 0, 150, 500, 38, 8).color(color));
p.part("branch-drop-1", c(-300, 0, 150, 500, 38, 8).color(color));
p.part("branch-drop-2", c(0, 0, 150, 500, 38, 8).color(color));
p.part("branch-drop-3", c(300, 0, 150, 500, 38, 8).color(color));
p.part("branch-drop-4", c(600, 0, 150, 500, 38, 8).color(color));
p.part("branch-valve-0", c(-600, -110, 480, 90, 52, 8).color(color));
p.part("branch-valve-1", c(-300, -110, 480, 90, 52, 8).color(color));
p.part("branch-valve-2", c(0, -110, 480, 90, 52, 8).color(color));
p.part("branch-valve-3", c(300, -110, 480, 90, 52, 8).color(color));
p.part("branch-valve-4", c(600, -110, 480, 90, 52, 8).color(color));

return p.model();
