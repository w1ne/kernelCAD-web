// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "plastic-flake-dryer",
  license: 'CC0-1.0',
  title: "Plastic flake dryer",
  description: "Plastic flake dryer as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e6982", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("plastic-flake-dryer");
p.part("wash-frame-left", b(-550.1999999999999,0,0,85,1130,852.5000000000001).color(color));
p.part("wash-frame-right", b(550.1999999999999,0,0,85,1130,852.5000000000001).color(color));
p.part("process-tank", b(0,0,240,916.9999999999999,836.2,589.0).color(color));
p.part("top-cover", b(0,0,961.0,1021.8000000000001,904.0,90).color(color));
p.part("feed-hopper", b(0,-508.5,1054.0,655.0,260,350).color(color));
p.part("outlet-chute", b(0,485.9,140,628.8,270,380).color(color));
p.part("agitation-drum", cy(0,0,589.0,734.5,393.0,12).color(color));
p.part("pump", c(681.2,-282.5,0,330,110,10).color(color));
p.part("pipe-run", b(641.9,0,744.0,100,120,620.0).color(color));

return p.model();
