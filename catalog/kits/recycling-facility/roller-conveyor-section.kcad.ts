// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "roller-conveyor-section",
  license: 'CC0-1.0',
  title: "Roller conveyor section",
  description: "Roller conveyor section as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#566d83", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("roller-conveyor-section");
p.part("base-left", b(-374.4,0,0,95,2540,150).color(color));
p.part("base-right", b(374.4,0,0,95,2540,150).color(color));
p.part("belt-deck", b(0,0,210,686.4,2286.0,115).color(color));
p.part("belt-surface", b(0,0,325,624.0,2235.2,55).color(color));
p.part("side-rail-left", b(-327.59999999999997,0,380,55,2184.4,105).color(color));
p.part("side-rail-right", b(327.59999999999997,0,380,55,2184.4,105).color(color));
p.part("tail-support-left", b(-265.20000000000005,-914.4,150,65,65,565).color(color));
p.part("tail-support-right", b(265.20000000000005,-914.4,150,65,65,565).color(color));
p.part("head-support-left", b(-265.20000000000005,914.4,150,65,65,130).color(color));
p.part("head-support-right", b(265.20000000000005,914.4,150,65,65,130).color(color));
p.part("head-roller", cy(0,1193.8,352.59999999999997,90,327.59999999999997,10).color(color));
p.part("tail-roller", cy(0,-1143.0,352.59999999999997,90,327.59999999999997,10).color(color));
p.part("feed-chute", b(0,-1270.0,393.25000000000006,686.4,200,260).color(color));
p.part("drive-motor", c(452.4,1016.0,180,260,90,10).color(color));

return p.model();
