// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "near-infrared-sorter",
  license: 'CC0-1.0',
  title: "Near-infrared sorter",
  description: "Near-infrared sorter as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
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

const p = assembly("near-infrared-sorter");
p.part("belt-frame", b(0,0,0,780,2020,180).color(color));
p.part("belt-surface", b(0,0,180,670.8,1919.0,55).color(color));
p.part("support-left-front", b(-327.59999999999997,-767.6,0,65,65,500).color(color));
p.part("support-right-front", b(327.59999999999997,-767.6,0,65,65,500).color(color));
p.part("support-left-back", b(-327.59999999999997,767.6,0,65,65,500).color(color));
p.part("support-right-back", b(327.59999999999997,767.6,0,65,65,500).color(color));
p.part("sensor-arch-left", b(-452.4,0,500,85,100,850).color(color));
p.part("sensor-arch-right", b(452.4,0,500,85,100,850).color(color));
p.part("sensor-bridge", b(0,0,1280,998.4,110,95).color(color));
p.part("camera-pod-a", b(-195.0,0,1350,160,150,150).color(color));
p.part("camera-pod-b", b(195.0,0,1350,160,150,150).color(color));
p.part("indicator", c(0,-707.0,1250,95,42,10).color(color));

return p.model();
