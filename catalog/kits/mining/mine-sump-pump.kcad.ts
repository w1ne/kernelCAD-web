// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mine-sump-pump",
  license: 'CC0-1.0',
  title: "Mine sump pump",
  description: "Submersible mine pump with screened intake, motor housing, lifting bail, cable, and discharge outlet. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#606b64", { label: 'Asset color' });
const baseZ=25;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("mine-sump-pump");
p.part("motor-body", c(0, 0, 80, 470, 160, 12).color(color));
p.part("pump-head", c(0, 0, 550, 100, 130, 10).color(color));
p.part("intake-foot", b(0, 0, 25, 280, 280, 55).color(color));
p.part("screen-guard-front", b(0, -145, 55, 235, 28, 260).color(color));
p.part("screen-guard-back", b(0, 145, 55, 235, 28, 260).color(color));
p.part("handle-left", b(-95, 0, 555, 35, 40, 155).color(color));
p.part("handle-right", b(95, 0, 555, 35, 40, 155).color(color));
p.part("discharge-nozzle", c(0, -180, 520, 130, 70, 8).color(color));
p.part("power-cable", b(120, 0, 645, 32, 32, 240).color(color));
p.part("cable-entry", c(120, 0, 850, 55, 42, 8).color(color));

return p.model();
