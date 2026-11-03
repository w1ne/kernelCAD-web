// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "bottle-crusher",
  license: 'CC0-1.0',
  title: "Bottle crusher",
  description: "Bottle crusher as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("bottle-crusher");
p.part("base-frame", b(0,0,0,1310,990,170).color(color));
p.part("cutting-housing", b(0,0,170,1048.0,693.0,700.0000000000001).color(color));
p.part("feed-hopper-front", b(0,-415.8,700.0000000000001,1152.8,316.8,500.0).color(color));
p.part("feed-lip", b(0,-544.5,687.5,1179.0,130,85).color(color));
p.part("discharge-chute", b(0,415.8,170,812.2,237.6,437.5).color(color));
p.part("cutting-shaft-a", cy(-262.0,0,425.00000000000006,574.1999999999999,95,12).color(color));
p.part("cutting-shaft-b", cy(262.0,0,425.00000000000006,574.1999999999999,95,12).color(color));
p.part("side-service-panel", b(550.1999999999999,0,350.00000000000006,75,435.6,450.0).color(color));
p.part("drive-motor", c(746.6999999999999,257.40000000000003,210,330,135,10).color(color));
p.part("warning-beacon", c(-497.8,-297.0,1050.0,105,45,10).color(color));

return p.model();
