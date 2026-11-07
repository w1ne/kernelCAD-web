// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "slurry-pump-skid",
  license: 'CC0-1.0',
  title: "Slurry pump skid",
  description: "Heavy-duty slurry pump with motor, guarded coupling, suction elbow, discharge riser, and base rails. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657a75", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("slurry-pump-skid");
p.part("base-skid", b(0, 0, 0, 1250, 600, 70).color(color));
p.part("motor", b(-300, 0, 90, 390, 340, 280).color(color));
p.part("coupling-guard", b(60, 0, 120, 170, 210, 130).color(color));
p.part("pump-casing", c(260, 0, 90, 320, 210, 12).color(color));
p.part("suction-flange", c(260, -250, 180, 90, 165, 12).color(color));
p.part("discharge-riser", b(260, 205, 400, 125, 125, 290).color(color));
p.part("discharge-flange", b(260, 205, 670, 210, 210, 55).color(color));
p.part("motor-foot-left", b(-390, -230, 65, 140, 80, 55).color(color));
p.part("motor-foot-right", b(-390, 230, 65, 140, 80, 55).color(color));

return p.model();
