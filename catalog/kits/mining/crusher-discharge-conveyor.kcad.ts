// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "crusher-discharge-conveyor",
  license: 'CC0-1.0',
  title: "Crusher discharge conveyor",
  description: "Short transfer conveyor with guarded belt, support frames, head and tail drums, and a drive unit. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c7059", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("crusher-discharge-conveyor");
p.part("belt", b(0, 0, 180, 1450, 430, 60).color(color));
p.part("left-stringer", b(0, -190, 80, 1450, 55, 100).color(color));
p.part("right-stringer", b(0, 190, 80, 1450, 55, 100).color(color));
p.part("leg-left", b(-440, -190, 0, 75, 75, 240).color(color));
p.part("leg-right", b(-440, 190, 0, 75, 75, 240).color(color));
p.part("head-leg-left", b(440, -190, 0, 75, 75, 360).color(color));
p.part("head-leg-right", b(440, 190, 0, 75, 75, 360).color(color));
p.part("tail-drum", hy(-730, 0, 180, 430, 70, 12).color(color));
p.part("head-drum", hy(730, 0, 270, 430, 70, 12).color(color));
p.part("drive-guard", b(600, 280, 230, 250, 190, 230).color(color));

return p.model();
