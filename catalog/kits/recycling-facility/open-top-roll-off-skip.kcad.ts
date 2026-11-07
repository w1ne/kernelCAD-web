// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "open-top-roll-off-skip",
  license: 'CC0-1.0',
  title: "Open-top roll-off skip",
  description: "Open-top roll-off skip as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4f7080", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("open-top-roll-off-skip");
p.part("floor-pan", b(0,0,0,1180,820,70).color(color));
p.part("front-wall", b(0,-372.0,70,1180,76,850).color(color));
p.part("rear-wall", b(0,372.0,70,1180,76,850).color(color));
p.part("left-wall", b(-552.0,0,70,76,700,850).color(color));
p.part("right-wall", b(552.0,0,70,76,700,850).color(color));
p.part("front-rim", b(0,-390.0,920,1210,45,48).color(color));
p.part("rear-rim", b(0,390.0,920,1210,45,48).color(color));
p.part("side-rib-left", b(-510.0,0,140,50,650,760).color(color));
p.part("side-rib-right", b(510.0,0,140,50,650,760).color(color));

return p.model();
