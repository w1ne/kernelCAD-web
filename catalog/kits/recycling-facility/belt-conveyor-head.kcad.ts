// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "belt-conveyor-head",
  license: 'CC0-1.0',
  title: "Belt conveyor head section",
  description: "Belt conveyor head section as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#61727c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("belt-conveyor-head");
p.part("base-left", b(-422.4,0,0,95,1500,150).color(color));
p.part("base-right", b(422.4,0,0,95,1500,150).color(color));
p.part("belt-deck", b(0,0,265,774.4,1350.0,115).color(color));
p.part("belt-surface", b(0,0,380,704.0,1320.0,55).color(color));
p.part("side-rail-left", b(-369.59999999999997,0,435,55,1290.0,105).color(color));
p.part("side-rail-right", b(369.59999999999997,0,435,55,1290.0,105).color(color));
p.part("tail-support-left", b(-299.20000000000005,-540.0,150,65,65,700).color(color));
p.part("tail-support-right", b(299.20000000000005,-540.0,150,65,65,700).color(color));
p.part("head-support-left", b(-299.20000000000005,540.0,150,65,65,185).color(color));
p.part("head-support-right", b(299.20000000000005,540.0,150,65,65,185).color(color));
p.part("head-roller", cy(0,705.0,394.59999999999997,90,369.59999999999997,10).color(color));
p.part("tail-roller", cy(0,-675.0,394.59999999999997,90,369.59999999999997,10).color(color));
p.part("feed-chute", b(0,-750.0,467.50000000000006,774.4,200,260).color(color));
p.part("drive-motor", c(510.4,600.0,180,260,90,10).color(color));

return p.model();
