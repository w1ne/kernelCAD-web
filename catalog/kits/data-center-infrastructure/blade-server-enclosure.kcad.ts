// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "blade-server-enclosure",
  license: 'CC0-1.0',
  title: "Blade server enclosure",
  description: "Modular blade enclosure with repeated vertical sleds and rear service rails. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707a82", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("blade-server-enclosure");
p.part("chassis-shell", b(0, 0, 0, 600, 800, 440).color(color));
p.part("front-face", b(0, -412.0, 10, 572, 24, 420).color(color));
p.part("left-mounting-ear", b(-324.0, 0, 0, 32, 800, 440).color(color));
p.part("right-mounting-ear", b(324.0, 0, 0, 32, 800, 440).color(color));
p.part("slide-rail-left", hx(0, -272.0, 35, 720, 12, 8).color(color));
p.part("slide-rail-right", hx(0, 272.0, 35, 720, 12, 8).color(color));
p.part("blade-sled-0", b(-240.0, -224.00000000000003, 30, 84.00000000000001, 440.00000000000006, 375).color(color));
p.part("blade-sled-1", b(-144.0, -224.00000000000003, 30, 84.00000000000001, 440.00000000000006, 375).color(color));
p.part("blade-sled-2", b(-48.0, -224.00000000000003, 30, 84.00000000000001, 440.00000000000006, 375).color(color));
p.part("blade-sled-3", b(48.0, -224.00000000000003, 30, 84.00000000000001, 440.00000000000006, 375).color(color));
p.part("blade-sled-4", b(144.0, -224.00000000000003, 30, 84.00000000000001, 440.00000000000006, 375).color(color));
p.part("blade-sled-5", b(240.0, -224.00000000000003, 30, 84.00000000000001, 440.00000000000006, 375).color(color));
p.part("service-handle", b(0, -425.0, 70, 450.0, 20, 35).color(color));

return p.model();
