// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "landfill-monitoring-pedestal",
  license: 'CC0-1.0',
  title: "Landfill monitoring pedestal",
  description: "Landfill monitoring pedestal as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c6955", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("landfill-monitoring-pedestal");
p.part("concrete-plinth", b(0,0,0,760,840,110).color(color));
p.part("equipment-cabinet", b(0,0,110,547.1999999999999,537.6,804.6).color(color));
p.part("display-face", b(0,-285.6,581.1,334.4,55,327.8).color(color));
p.part("sensor-mast", b(228.0,210.0,110,80,80,1102.6).color(color));
p.part("weather-hood", b(0,0,1043.0,684.0,672.0,80).color(color));
p.part("sensor-dish", c(228.0,210.0,1311.2,140,90,10).color(color));
p.part("sample-port", c(-228.0,-285.6,150,100,28,10).color(color));
p.part("service-handle", cy(304.0,-327.6,447.0,100,28,10).color(color));

return p.model();
