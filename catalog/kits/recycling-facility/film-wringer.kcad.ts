// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "film-wringer",
  license: 'CC0-1.0',
  title: "Plastic film wringer",
  description: "Plastic film wringer as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#77715b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("film-wringer");
p.part("wash-frame-left", b(-495.59999999999997,0,0,85,990,770.0000000000001).color(color));
p.part("wash-frame-right", b(495.59999999999997,0,0,85,990,770.0000000000001).color(color));
p.part("process-tank", b(0,0,240,826.0,732.6,532.0).color(color));
p.part("top-cover", b(0,0,868.0,920.4,792.0,90).color(color));
p.part("feed-hopper", b(0,-445.5,952.0000000000001,590.0,260,350).color(color));
p.part("outlet-chute", b(0,425.7,140,566.4,270,380).color(color));
p.part("agitation-drum", cy(0,0,532.0,643.5,354.0,12).color(color));
p.part("pump", c(613.6,-247.5,0,330,110,10).color(color));
p.part("pipe-run", b(578.2,0,672.0,100,120,560.0).color(color));

return p.model();
