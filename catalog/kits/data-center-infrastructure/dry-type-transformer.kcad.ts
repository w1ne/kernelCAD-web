// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dry-type-transformer",
  license: 'CC0-1.0',
  title: "Dry-type transformer",
  description: "Ventilated transformer block with cooling fins, terminal bushings, and base rails. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b795a", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("dry-type-transformer");
p.part("base-frame", b(0, 0, 0, 1200, 1000, 100).color(color));
p.part("transformer-core", b(0, 0, 100, 760, 680, 800).color(color));
p.part("cooling-fin-0", b(-500, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-1", b(-375, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-2", b(-250, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-3", b(-125, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-4", b(0, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-5", b(125, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-6", b(250, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-7", b(375, 0, 180, 48, 880, 620).color(color));
p.part("cooling-fin-8", b(500, 0, 180, 48, 880, 620).color(color));
p.part("terminal-bushing-0", c(-250, 0, 900, 190, 72, 10).color(color));
p.part("terminal-bushing-1", c(0, 0, 900, 190, 72, 10).color(color));
p.part("terminal-bushing-2", c(250, 0, 900, 190, 72, 10).color(color));
p.part("terminal-cover", b(0, 0, 1050, 930, 850, 60).color(color));

return p.model();
