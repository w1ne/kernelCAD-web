// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "run-of-mine-hopper",
  license: 'CC0-1.0',
  title: "Run-of-mine feed hopper",
  description: "Large feed hopper with reinforced rim, four support legs, and a central discharge throat. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#787469", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("run-of-mine-hopper");
p.part("throat", b(0, 0, 40, 420, 380, 210).color(color));
p.part("hopper-front", b(0, -250, 180, 880, 80, 440).color(color));
p.part("hopper-back", b(0, 250, 180, 880, 80, 440).color(color));
p.part("hopper-left", b(-400, 0, 180, 80, 420, 440).color(color));
p.part("hopper-right", b(400, 0, 180, 80, 420, 440).color(color));
p.part("leg-left-front", b(-360, -220, 0, 80, 80, 180).color(color));
p.part("leg-right-front", b(360, -220, 0, 80, 80, 180).color(color));
p.part("leg-left-back", b(-360, 220, 0, 80, 80, 180).color(color));
p.part("leg-right-back", b(360, 220, 0, 80, 80, 180).color(color));
p.part("gate-shaft", c(0, 0, 0, 95, 155, 8).color(color));

return p.model();
