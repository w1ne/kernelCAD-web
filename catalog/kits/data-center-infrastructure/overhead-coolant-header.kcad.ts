// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "overhead-coolant-header",
  license: 'CC0-1.0',
  title: "Overhead coolant header",
  description: "Suspended supply and return pipes with branch drops and hanger brackets. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#647b79", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("overhead-coolant-header");
p.part("hanger-left", b(-800, 0, 0, 110, 520, 420).color(color));
p.part("hanger-right", b(800, 0, 0, 110, 520, 420).color(color));
p.part("supply-main", hy(0, 0, 360, 1900, 65, 10).color(color));
p.part("return-main", hy(0, 0, 200, 1900, 65, 10).color(color));
p.part("branch-drop-0", c(-700, 0, 150, 260, 30, 8).color(color));
p.part("branch-drop-1", c(-350, 0, 150, 260, 30, 8).color(color));
p.part("branch-drop-2", c(0, 0, 150, 260, 30, 8).color(color));
p.part("branch-drop-3", c(350, 0, 150, 260, 30, 8).color(color));
p.part("branch-drop-4", c(700, 0, 150, 260, 30, 8).color(color));
p.part("pipe-clamp-0", b(-700, 0, 415, 100, 200, 35).color(color));
p.part("pipe-clamp-1", b(-350, 0, 415, 100, 200, 35).color(color));
p.part("pipe-clamp-2", b(0, 0, 415, 100, 200, 35).color(color));
p.part("pipe-clamp-3", b(350, 0, 415, 100, 200, 35).color(color));
p.part("pipe-clamp-4", b(700, 0, 415, 100, 200, 35).color(color));

return p.model();
