// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "handheld-ph-meter",
  license: 'CC0-1.0',
  title: "Handheld pH meter",
  description: "Portable acidity meter with a recessed display, key pad, electrode holder and short cable tail. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71857c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("handheld-ph-meter");
p.part("meter-shell", b(0,0,85,260,165,430).color(color));
p.part("upper-cap", b(0,0,515,285,180,65).color(color));
p.part("display", b(0,-90,390,185,20,115).color(color));
p.part("keypad", b(0,-92,230,190,20,95).color(color));
p.part("left-key", b(-55,-108,230,35,18,34).color(color));
p.part("right-key", b(55,-108,230,35,18,34).color(color));
p.part("probe-holder", b(160,0,120,85,75,100).color(color));
p.part("electrode", c(160,0,0,230,18,10).color(color));
p.part("connector", c(-70,0,570,90,34,10).color(color));
p.part("cable-end", c(-110,0,545,100,22,10).color(color));

return p.model();
