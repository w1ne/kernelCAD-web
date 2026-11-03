// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "condenser-pump-skid",
  license: 'CC0-1.0',
  title: "Condenser pump skid",
  description: "Pumping skid with paired motors, horizontal pump bodies, and manifold pipes. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727a6f", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("condenser-pump-skid");
p.part("base-skid", b(0, 0, 0, 1900, 850, 110).color(color));
p.part("motor-0", b(-480, 0, 110, 520, 430, 430).color(color));
p.part("motor-1", b(480, 0, 110, 520, 430, 430).color(color));
p.part("pump-body-0", hx(-480, -240, 360, 600, 170, 10).color(color));
p.part("pump-body-1", hx(480, -240, 360, 600, 170, 10).color(color));
p.part("suction-header", hy(0, 0, 225, 1700, 65, 10).color(color));
p.part("discharge-header", hy(0, 0, 620, 1700, 65, 10).color(color));
p.part("pipe-support-0", c(-500, 0, 110, 270, 35, 8).color(color));
p.part("pipe-support-1", c(500, 0, 110, 270, 35, 8).color(color));

return p.model();
