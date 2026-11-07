// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "battery-quarantine-drum",
  license: 'CC0-1.0',
  title: "Battery quarantine drum",
  description: "Battery quarantine drum as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687b55", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("battery-quarantine-drum");
p.part("spill-pallet", b(0,0,0,997.5,798.0,120).color(color));
p.part("drum-body", c(0,0,120,1730,273.59999999999997,12).color(color));
p.part("top-rim", c(0,0,1850,55,288.8,12).color(color));
p.part("bung-a", c(-114.0,0,1910,70,45,10).color(color));
p.part("bung-b", c(114.0,0,1910,70,32,10).color(color));
p.part("label-band", b(0,-273.59999999999997,968.8000000000001,456.0,34,110).color(color));
p.part("pallet-foot-left", c(-323.0,0,0,95,48,10).color(color));
p.part("pallet-foot-right", c(323.0,0,0,95,48,10).color(color));

return p.model();
