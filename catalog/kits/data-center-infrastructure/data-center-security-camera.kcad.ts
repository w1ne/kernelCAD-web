// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "data-center-security-camera",
  license: 'CC0-1.0',
  title: "Data-center security camera",
  description: "Compact fixed camera on a service mast with sunshield and mounting base. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5b666d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("data-center-security-camera");
p.part("mounting-base", b(0, 0, 0, 300, 300, 55).color(color));
p.part("mast", c(0, 0, 55, 950, 48, 8).color(color));
p.part("camera-housing", hx(0, -30, 1030, 330, 82, 10).color(color));
p.part("sunshield", b(0, -30, 1110, 380, 200, 26).color(color));
p.part("lens-barrel", c(0, -190, 1030, 135, 45, 10).color(color));
p.part("bracket", b(0, 0, 880, 220, 110, 45).color(color));

return p.model();
