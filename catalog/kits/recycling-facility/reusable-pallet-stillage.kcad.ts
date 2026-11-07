// SPDX-License-Identifier: CC0-1.0
// Reusable pallet stillage: an open-top steel body with a rolled rim and side reinforcing ribs. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "reusable-pallet-stillage",
  license: 'CC0-1.0',
  title: "Reusable pallet stillage",
  description: "Reusable pallet stillage: an open-top steel body with a rolled rim and side reinforcing ribs. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#707b86', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#707678', stainlessSteel: '#9ea7a5' },
  highVisibility: { paintedSteel: '#d77632' },
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("reusable-pallet-stillage");
p.part("floor-pan", b(0,0,0,1180,820,70).color(paintedSteel));
p.part("front-wall", b(0,-372.0,70,1180,76,990).color(paintedSteel));
p.part("rear-wall", b(0,372.0,70,1180,76,990).color(paintedSteel));
p.part("left-wall", b(-552.0,0,70,76,700,990).color(paintedSteel));
p.part("right-wall", b(552.0,0,70,76,700,990).color(paintedSteel));
p.part("front-rim", b(0,-390.0,1060,1210,45,48).color(stainlessSteel));
p.part("rear-rim", b(0,390.0,1060,1210,45,48).color(stainlessSteel));
p.part("side-rib-left", b(-510.0,0,140,50,650,900).color(stainlessSteel));
p.part("side-rib-right", b(510.0,0,140,50,650,900).color(stainlessSteel));

return p.model();
