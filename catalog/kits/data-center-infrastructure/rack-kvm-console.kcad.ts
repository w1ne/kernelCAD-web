// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rack-kvm-console",
  license: 'CC0-1.0',
  title: "Rack KVM console",
  description: "Pull-out console tray with display housing, keyboard surface, and rack ears. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#616e78", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("rack-kvm-console");
p.part("chassis-shell", b(0, 0, 0, 440, 620, 80).color(color));
p.part("front-face", b(0, -322.0, 10, 412, 24, 60).color(color));
p.part("left-mounting-ear", b(-244.0, 0, 0, 32, 620, 80).color(color));
p.part("right-mounting-ear", b(244.0, 0, 0, 32, 620, 80).color(color));
p.part("slide-rail-left", hx(0, -210.8, 35, 560, 12, 8).color(color));
p.part("slide-rail-right", hx(0, 210.8, 35, 560, 12, 8).color(color));
p.part("display-housing", b(0, -111.6, 95, 387.2, 210.8, 300).color(color));
p.part("keyboard-tray", b(0, -260.4, 18, 378.4, 155.0, 24).color(color));
p.part("hinge-left", c(-167.2, -167.4, 70, 28, 18, 8).color(color));
p.part("hinge-right", c(167.2, -167.4, 70, 28, 18, 8).color(color));

return p.model();
