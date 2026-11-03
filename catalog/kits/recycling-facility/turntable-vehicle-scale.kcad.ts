// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "turntable-vehicle-scale",
  license: 'CC0-1.0',
  title: "Turntable vehicle scale",
  description: "Turntable vehicle scale as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#47758a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("turntable-vehicle-scale");
p.part("scale-foundation", b(0,0,0,2700,2700,110).color(color));
p.part("rotating-weigh-deck", c(0,0,110,150,1020,16).color(color));
p.part("approach-ramp-front", b(0,-1680,0,2150,720,120).color(color));
p.part("approach-ramp-back", b(0,1680,0,2150,720,120).color(color));
p.part("deck-edge-left", b(-1160,0,90,70,2220,110).color(color));
p.part("deck-edge-right", b(1160,0,90,70,2220,110).color(color));
p.part("control-pedestal", b(1430,-880,0,180,180,760).color(color));
p.part("scale-display", b(1430,-880,760,520,250,290).color(color));
p.part("load-cell-front-left", c(-860,-860,35,90,68,10).color(color));
p.part("load-cell-front-right", c(860,-860,35,90,68,10).color(color));
p.part("load-cell-back-left", c(-860,860,35,90,68,10).color(color));
p.part("load-cell-back-right", c(860,860,35,90,68,10).color(color));

return p.model();
