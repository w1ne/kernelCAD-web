// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "magnet-cleanout-drum",
  license: 'CC0-1.0',
  title: "Magnet clean-out drum",
  description: "Magnet clean-out drum as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("magnet-cleanout-drum");
p.part("base-rail-left", b(-351.0,0,0,100,2020,150).color(color));
p.part("base-rail-right", b(351.0,0,0,100,2020,150).color(color));
p.part("feed-hopper", b(0,-969.5999999999999,150,780,420,620).color(color));
p.part("screen-drum", cy(0,707.0,520,1252.4,296.4,12).color(color));
p.part("drive-ring-front", cy(0,-161.6,520,115,335.4,12).color(color));
p.part("drive-ring-back", cy(0,888.8,520,115,335.4,12).color(color));
p.part("discharge-chute", b(0,969.5999999999999,150,561.6,380,380).color(color));
p.part("drive-motor", c(390.0,242.39999999999998,270,400,130,10).color(color));

return p.model();
