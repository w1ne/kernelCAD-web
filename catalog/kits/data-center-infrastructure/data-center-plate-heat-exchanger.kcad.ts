// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "data-center-plate-heat-exchanger",
  license: 'CC0-1.0',
  title: "Data-center plate heat exchanger",
  description: "Compact exchanger stack with tie bars, frame plates, and pipe flanges. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65767a", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("data-center-plate-heat-exchanger");
p.part("support-skid", b(0, 0, 0, 1100, 720, 100).color(color));
p.part("plate-stack", b(0, 0, 100, 650, 560, 930).color(color));
p.part("plate-0", b(-290, 0, 160, 24, 540, 820).color(color));
p.part("plate-1", b(-248, 0, 160, 24, 540, 820).color(color));
p.part("plate-2", b(-206, 0, 160, 24, 540, 820).color(color));
p.part("plate-3", b(-164, 0, 160, 24, 540, 820).color(color));
p.part("plate-4", b(-122, 0, 160, 24, 540, 820).color(color));
p.part("plate-5", b(-80, 0, 160, 24, 540, 820).color(color));
p.part("plate-6", b(-38, 0, 160, 24, 540, 820).color(color));
p.part("plate-7", b(4, 0, 160, 24, 540, 820).color(color));
p.part("plate-8", b(46, 0, 160, 24, 540, 820).color(color));
p.part("plate-9", b(88, 0, 160, 24, 540, 820).color(color));
p.part("plate-10", b(130, 0, 160, 24, 540, 820).color(color));
p.part("plate-11", b(172, 0, 160, 24, 540, 820).color(color));
p.part("plate-12", b(214, 0, 160, 24, 540, 820).color(color));
p.part("plate-13", b(256, 0, 160, 24, 540, 820).color(color));
p.part("fixed-frame", b(-400, 0, 90, 85, 700, 1030).color(color));
p.part("pressure-frame", b(400, 0, 90, 85, 700, 1030).color(color));
p.part("inlet-flange", hy(0, -390, 300, 130, 80, 10).color(color));
p.part("outlet-flange", hy(0, 390, 680, 130, 80, 10).color(color));

return p.model();
