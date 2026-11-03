// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "glass-dryer",
  license: 'CC0-1.0',
  title: "Glass dryer",
  description: "Glass dryer as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#647b66", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("glass-dryer");
p.part("wash-frame-left", b(-441.0,0,0,85,990,935.0000000000001).color(color));
p.part("wash-frame-right", b(441.0,0,0,85,990,935.0000000000001).color(color));
p.part("process-tank", b(0,0,240,735.0,732.6,646.0).color(color));
p.part("top-cover", b(0,0,1054.0,819.0,792.0,90).color(color));
p.part("feed-hopper", b(0,-445.5,1156.0,525.0,260,350).color(color));
p.part("outlet-chute", b(0,425.7,140,504.0,270,380).color(color));
p.part("agitation-drum", cy(0,0,646.0,643.5,315.0,12).color(color));
p.part("pump", c(546.0,-247.5,0,330,110,10).color(color));
p.part("pipe-run", b(514.5,0,816.0,100,120,680.0).color(color));

return p.model();
