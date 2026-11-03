// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "belt-conveyor-tail",
  license: 'CC0-1.0',
  title: "Belt conveyor tail section",
  description: "Belt conveyor tail section as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b754b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("belt-conveyor-tail");
p.part("base-left", b(-470.4,0,0,95,1760,150).color(color));
p.part("base-right", b(470.4,0,0,95,1760,150).color(color));
p.part("belt-deck", b(0,0,320,862.4,1584.0,115).color(color));
p.part("belt-surface", b(0,0,435,784.0,1548.8,55).color(color));
p.part("side-rail-left", b(-411.59999999999997,0,490,55,1513.6,105).color(color));
p.part("side-rail-right", b(411.59999999999997,0,490,55,1513.6,105).color(color));
p.part("tail-support-left", b(-333.20000000000005,-633.6,150,65,65,835).color(color));
p.part("tail-support-right", b(333.20000000000005,-633.6,150,65,65,835).color(color));
p.part("head-support-left", b(-333.20000000000005,633.6,150,65,65,240).color(color));
p.part("head-support-right", b(333.20000000000005,633.6,150,65,65,240).color(color));
p.part("head-roller", cy(0,827.1999999999999,436.59999999999997,90,411.59999999999997,10).color(color));
p.part("tail-roller", cy(0,-792.0,436.59999999999997,90,411.59999999999997,10).color(color));
p.part("feed-chute", b(0,-880.0,541.75,862.4,200,260).color(color));
p.part("drive-motor", c(568.4,704.0,180,260,90,10).color(color));

return p.model();
