// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stacker-reclaimer-boom",
  license: 'CC0-1.0',
  title: "Stacker reclaimer boom",
  description: "Yard boom assembly with turntable, trussed conveyor, support portal, and bucket-wheel end housing. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7e7158", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("stacker-reclaimer-boom");
p.part("foundation", b(0, 0, 0, 700, 620, 90).color(color));
p.part("turntable", c(0, 0, 90, 170, 290, 12).color(color));
p.part("portal-left", b(-180, 0, 260, 90, 90, 610).color(color));
p.part("portal-right", b(180, 0, 260, 90, 90, 610).color(color));
p.part("portal-top", b(0, 0, 850, 500, 110, 85).color(color));
p.part("boom-belt", b(450, 0, 770, 1100, 220, 65).color(color));
p.part("boom-truss", b(450, 0, 600, 1050, 60, 220).color(color));
p.part("bucket-wheel", c(1000, 0, 530, 250, 240, 12).color(color));
p.part("counterweight", b(-500, 0, 200, 300, 440, 360).color(color));
p.part("operator-cab", b(0, -300, 650, 250, 180, 260).color(color));

return p.model();
