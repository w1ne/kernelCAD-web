// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "belt-magnet-separator",
  license: 'CC0-1.0',
  title: "Overband belt magnet separator",
  description: "Overband magnetic separator above a short ore belt with suspended magnet housing and support portal. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#73766c", { label: 'Asset color' });
const baseZ=80;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("belt-magnet-separator");
p.part("conveyor-belt", b(0, 0, 150, 1120, 480, 55).color(color));
p.part("left-stringer", b(0, -220, 90, 1120, 55, 100).color(color));
p.part("right-stringer", b(0, 220, 90, 1120, 55, 100).color(color));
p.part("portal-left", b(-100, -300, 235, 65, 65, 560).color(color));
p.part("portal-right", b(-100, 300, 235, 65, 65, 560).color(color));
p.part("portal-top", b(-100, 0, 780, 700, 70, 70).color(color));
p.part("magnet-housing", b(-100, 0, 590, 360, 350, 150).color(color));
p.part("coil-cap", c(-100, 0, 740, 60, 180, 10).color(color));
p.part("control-box", b(420, -290, 110, 190, 150, 290).color(color));
p.part("belt-drum", hy(520, 0, 150, 500, 70, 10).color(color));

return p.model();
