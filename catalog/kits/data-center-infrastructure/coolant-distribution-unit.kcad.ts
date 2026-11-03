// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "coolant-distribution-unit",
  license: 'CC0-1.0',
  title: "Coolant distribution unit",
  description: "Liquid-cooling cabinet with pump bay, heat-exchanger block, and pipe connections. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#56727a", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("coolant-distribution-unit");
p.part("cdu-skid", b(0, 0, 0, 1450, 850, 100).color(color));
p.part("cdu-cabinet", b(0, 0, 100, 1200, 760, 1600).color(color));
p.part("service-door", b(0, -395, 220, 800, 30, 1380).color(color));
p.part("heat-exchanger-plate-0", b(-280, 120, 420, 38, 450, 800).color(color));
p.part("heat-exchanger-plate-1", b(-200, 120, 420, 38, 450, 800).color(color));
p.part("heat-exchanger-plate-2", b(-120, 120, 420, 38, 450, 800).color(color));
p.part("heat-exchanger-plate-3", b(-40, 120, 420, 38, 450, 800).color(color));
p.part("heat-exchanger-plate-4", b(40, 120, 420, 38, 450, 800).color(color));
p.part("heat-exchanger-plate-5", b(120, 120, 420, 38, 450, 800).color(color));
p.part("heat-exchanger-plate-6", b(200, 120, 420, 38, 450, 800).color(color));
p.part("heat-exchanger-plate-7", b(280, 120, 420, 38, 450, 800).color(color));
p.part("supply-connection", hy(0, 445, 520, 180, 78, 10).color(color));
p.part("return-connection", hy(0, 445, 840, 180, 78, 10).color(color));
p.part("pump-motor", c(430, 120, 450, 310, 125, 10).color(color));

return p.model();
