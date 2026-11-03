// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "merge-conveyor-junction",
  license: 'CC0-1.0',
  title: "Merge conveyor junction",
  description: "Merge conveyor junction as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#506c68", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("merge-conveyor-junction");
p.part("base-left", b(-326.4,0,0,95,2020,150).color(color));
p.part("base-right", b(326.4,0,0,95,2020,150).color(color));
p.part("belt-deck", b(0,0,210,598.4,1818.0,115).color(color));
p.part("belt-surface", b(0,0,325,544.0,1777.6,55).color(color));
p.part("side-rail-left", b(-285.59999999999997,0,380,55,1737.2,105).color(color));
p.part("side-rail-right", b(285.59999999999997,0,380,55,1737.2,105).color(color));
p.part("tail-support-left", b(-231.20000000000002,-727.1999999999999,150,65,65,430).color(color));
p.part("tail-support-right", b(231.20000000000002,-727.1999999999999,150,65,65,430).color(color));
p.part("head-support-left", b(-231.20000000000002,727.1999999999999,150,65,65,130).color(color));
p.part("head-support-right", b(231.20000000000002,727.1999999999999,150,65,65,130).color(color));
p.part("head-roller", cy(0,949.4,310.59999999999997,90,285.59999999999997,10).color(color));
p.part("tail-roller", cy(0,-909.0,310.59999999999997,90,285.59999999999997,10).color(color));
p.part("feed-chute", b(0,-1010.0,319.0,598.4,200,260).color(color));
p.part("drive-motor", c(394.4,808.0,180,260,90,10).color(color));

return p.model();
