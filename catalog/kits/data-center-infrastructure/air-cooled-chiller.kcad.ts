// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "air-cooled-chiller",
  license: 'CC0-1.0',
  title: "Air-cooled chiller",
  description: "Outdoor chiller frame with multiple top fans, coil banks, and service panels. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657379", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("air-cooled-chiller");
p.part("chiller-skid", b(0, 0, 0, 3200, 1500, 130).color(color));
p.part("coil-bank-left", b(-1050, 0, 130, 850, 1350, 700).color(color));
p.part("coil-bank-right", b(1050, 0, 130, 850, 1350, 700).color(color));
p.part("condenser-fan-0", c(-1100, -400, 830, 65, 210, 12).color(color));
p.part("condenser-fan-1", c(0, -400, 830, 65, 210, 12).color(color));
p.part("condenser-fan-2", c(1100, -400, 830, 65, 210, 12).color(color));
p.part("condenser-fan-3", c(-1100, 400, 830, 65, 210, 12).color(color));
p.part("condenser-fan-4", c(0, 400, 830, 65, 210, 12).color(color));
p.part("condenser-fan-5", c(1100, 400, 830, 65, 210, 12).color(color));
p.part("compressor-cover", b(0, 0, 130, 900, 1100, 580).color(color));
p.part("refrigerant-port", c(0, 620, 220, 115, 55, 10).color(color));

return p.model();
