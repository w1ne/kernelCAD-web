// SPDX-License-Identifier: CC0-1.0
// Cardboard bale cage: an open-top steel body with a rolled rim and side reinforcing ribs. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "cardboard-bale-cage",
  license: 'CC0-1.0',
  title: "Cardboard bale cage",
  description: "Cardboard bale cage: an open-top steel body with a rolled rim and side reinforcing ribs. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#60766f', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#657268', stainlessSteel: '#9ea7a5' },
  highVisibility: { paintedSteel: '#d77632' },
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("cardboard-bale-cage");
p.part("floor-pan", b(0,0,0,1360,820,70).color(paintedSteel));
p.part("front-wall", b(0,-372.0,70,1360,76,920).color(paintedSteel));
p.part("rear-wall", b(0,372.0,70,1360,76,920).color(paintedSteel));
p.part("left-wall", b(-642.0,0,70,76,700,920).color(paintedSteel));
p.part("right-wall", b(642.0,0,70,76,700,920).color(paintedSteel));
p.part("front-rim", b(0,-390.0,990,1390,45,48).color(stainlessSteel));
p.part("rear-rim", b(0,390.0,990,1390,45,48).color(stainlessSteel));
p.part("side-rib-left", b(-600.0,0,140,50,650,830).color(stainlessSteel));
p.part("side-rib-right", b(600.0,0,140,50,650,830).color(stainlessSteel));

return p.model();
