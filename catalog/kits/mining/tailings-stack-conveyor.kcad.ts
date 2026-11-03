// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tailings-stack-conveyor",
  license: 'CC0-1.0',
  title: "Tailings stack conveyor",
  description: "Long tailings conveyor with trussed support, raised discharge end, belt, and transfer hood. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77766c", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("tailings-stack-conveyor");
p.part("belt", b(0, 0, 480, 1700, 300, 65).color(color));
p.part("left-stringer", b(0, -165, 410, 1680, 55, 80).color(color));
p.part("right-stringer", b(0, 165, 410, 1680, 55, 80).color(color));
p.part("support-left", b(-500, -165, 0, 90, 90, 410).color(color));
p.part("support-right", b(-500, 165, 0, 90, 90, 410).color(color));
p.part("head-support-left", b(500, -165, 0, 90, 90, 650).color(color));
p.part("head-support-right", b(500, 165, 0, 90, 90, 650).color(color));
p.part("truss-web", b(0, 0, 220, 1300, 55, 220).color(color));
p.part("discharge-hood", b(780, 0, 460, 220, 410, 200).color(color));
p.part("head-drum", hy(820, 0, 465, 420, 60, 10).color(color));

return p.model();
