// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "radial-stacker",
  license: 'CC0-1.0',
  title: "Radial stacker conveyor",
  description: "Mobile radial stacker with long trussed boom, wheeled pivot base, feed hopper, and discharge hood. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b0833f", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("radial-stacker");
p.part("pivot-base", b(-500, 0, 0, 460, 560, 120).color(color));
p.part("left-wheel", b(-520, -330, 0, 250, 90, 180).color(color));
p.part("right-wheel", b(-520, 330, 0, 250, 90, 180).color(color));
p.part("boom-belt", b(180, 0, 600, 1450, 270, 65).color(color));
p.part("boom-left-truss", b(180, -150, 500, 1450, 50, 70).color(color));
p.part("boom-right-truss", b(180, 150, 500, 1450, 50, 70).color(color));
p.part("support-leg", b(50, 0, 80, 80, 90, 490).color(color));
p.part("feed-hopper", b(-460, 0, 360, 330, 400, 280).color(color));
p.part("discharge-hood", b(920, 0, 590, 200, 360, 160).color(color));
p.part("pivot-bearing", c(-500, 0, 120, 120, 170, 10).color(color));

return p.model();
