// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "longwall-shearer",
  license: 'CC0-1.0',
  title: "Longwall shearer",
  description: "Armored face shearer with twin cutter drums, central drive housing, and low guide shoes. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77766a", { label: 'Asset color' });
const baseZ=45;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("longwall-shearer");
p.part("shearer-body", b(0, 0, 120, 820, 310, 175).color(color));
p.part("guide-shoe-left", b(-40, -250, 45, 940, 70, 80).color(color));
p.part("guide-shoe-right", b(-40, 250, 45, 940, 70, 80).color(color));
p.part("cutter-left", c(395, -235, 150, 160, 145, 10).color(color));
p.part("cutter-right", c(395, 235, 150, 160, 145, 10).color(color));
p.part("gearbox-left", b(-330, -170, 145, 180, 150, 160).color(color));
p.part("gearbox-right", b(-330, 170, 145, 180, 150, 160).color(color));
p.part("cable-arm", b(-440, 0, 265, 170, 75, 60).color(color));

return p.model();
